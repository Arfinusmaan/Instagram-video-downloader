import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  createReadStream, existsSync, mkdirSync, unlinkSync,
  statSync, readdirSync, mkdtempSync, rmSync
} from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { tmpdir } from 'os';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = Number(process.env.PORT) || 3001;
const bundledYtDlpPath = join(__dirname, '.tools', 'yt-dlp.exe');
const YT_DLP = process.env.YT_DLP_PATH || (existsSync(bundledYtDlpPath) ? bundledYtDlpPath : 'yt-dlp');
const FFPROBE = process.env.FFPROBE_PATH || ffprobeStatic.path;
const secretCookiesPath = '/etc/secrets/cookies.txt';
const localCookiesPath  = join(__dirname, 'cookies.txt');
const COOKIES_PATH = process.env.COOKIES_PATH || (existsSync(secretCookiesPath) ? secretCookiesPath : (existsSync(localCookiesPath) ? localCookiesPath : null));
if (COOKIES_PATH) console.log(`[INIT] Instagram cookies loaded from: ${COOKIES_PATH}`);
const DOWNLOAD_JOBS = new Map();
const JOB_TTL_MS = 30 * 60 * 1000;
const VALID_QUALITY_IDS = new Set(['4k', '2k', '1080p', '720p', '480p', '360p']);

// Temp folder for yt-dlp downloads
const TEMP_DIR = join(tmpdir(), 'omnistream_4k');
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

console.log(`[INIT] FFmpeg location: ${ffmpegPath || 'None'}`);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ─── Codec & Resolution Formatters ──────────────────────────────────────────

export function formatVideoCodec(vcodec) {
  if (!vcodec || vcodec === 'none') return null;
  const c = vcodec.toLowerCase();
  if (c.startsWith('avc1') || c.startsWith('h264')) return 'H.264';
  if (c.startsWith('av01') || c.includes('av1')) return 'AV1';
  if (c.startsWith('vp09') || c.startsWith('vp9')) return 'VP9';
  if (c.startsWith('hev1') || c.startsWith('hvc1') || c.includes('hevc') || c.includes('h265')) return 'H.265 / HEVC';
  if (c.startsWith('mp4v')) return 'MPEG-4';
  return vcodec.split('.')[0].toUpperCase();
}

export function formatAudioCodec(acodec) {
  if (!acodec || acodec === 'none') return null;
  const c = acodec.toLowerCase();
  if (c.startsWith('mp4a') || c.includes('aac')) return 'AAC';
  if (c.includes('opus')) return 'Opus';
  if (c.includes('vorbis')) return 'Vorbis';
  if (c.includes('mp3')) return 'MP3';
  if (c.includes('flac')) return 'FLAC';
  return acodec.split('.')[0].toUpperCase();
}

function isH264(format) {
  const codec = String(format?.vcodec || '').toLowerCase();
  return codec.startsWith('avc1') || codec.startsWith('h264');
}

function isAac(format) {
  const codec = String(format?.acodec || '').toLowerCase();
  return codec.startsWith('mp4a') || codec.includes('aac');
}

function isSDR(format) {
  const range = String(format?.dynamic_range || '').toLowerCase();
  return !range || range === 'sdr' || range === 'unknown';
}

function sanitizeFilename(value, fallback = 'video', maxLength = 110) {
  let cleaned = String(value || '')
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, ' ')
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  cleaned = Array.from(cleaned).slice(0, maxLength).join('')
    .replace(/[. ]+$/g, '');
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(cleaned)) cleaned = `_${cleaned}`;
  return cleaned || fallback;
}

function encodeFilenameHeader(filename) {
  return encodeURIComponent(filename).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getCaptionTitle(info, platformId) {
  const title = platformId === 'instagram'
    ? (info?.description || info?.title)
    : info?.title;
  const normalized = String(title || '').trim();
  if (!normalized || /^(instagram reel|instagram video|video)$/i.test(normalized)) {
    return platformId === 'instagram' ? 'Instagram_Reel' : 'video';
  }
  return normalized;
}

export function makeVideoFilename(info, url) {
  const platformId = detectPlatform(url).id;
  const caption = getCaptionTitle(info, platformId);
  const stem = sanitizeFilename(caption, platformId === 'instagram' ? 'Instagram_Reel' : `${platformId}_video`);
  return `${stem}.mp4`;
}

/**
 * Orientation-aware resolution classifier.
 * Never mistakes 1080x1920 portrait for 2K.
 */
export function getResolutionTier(width, height) {
  if (!width || !height) return null;
  const w = Number(width);
  const h = Number(height);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;

  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  const isPortrait = h > w;

  // 4K (2160p class)
  if (minDim >= 2000 || maxDim >= 3800) {
    return { id: '4k', label: '4K Ultra HD', resolutionClass: '2160p', tag: '4K UHD', order: 5, isPortrait };
  }
  // 2K / QHD (1440p class)
  if (minDim >= 1350 || maxDim >= 2400) {
    return { id: '2k', label: '2K Quad HD', resolutionClass: '1440p', tag: 'QHD', order: 4, isPortrait };
  }
  // 1080p Full HD
  if (minDim >= 980 || maxDim >= 1700) {
    return { id: '1080p', label: 'Full HD (1080p)', resolutionClass: '1080p', tag: 'FHD', order: 3, isPortrait };
  }
  // 720p HD
  if (minDim >= 680 || maxDim >= 1150) {
    return { id: '720p', label: 'HD (720p)', resolutionClass: '720p', tag: 'HD', order: 2, isPortrait };
  }
  // 480p SD
  if (minDim >= 440 || maxDim >= 750) {
    return { id: '480p', label: 'SD (480p)', resolutionClass: '480p', tag: 'SD', order: 1, isPortrait };
  }
  // 360p or lower
  return { id: '360p', label: '360p', resolutionClass: '360p', tag: '360p', order: 0, isPortrait };
}

function scoreVideoFormat(f) {
  // Prefer broadly supported source codecs within a resolution tier. This does
  // not transcode: yt-dlp downloads the selected stream as-is. AV1/VP9 are
  // excellent codecs but can produce audio-only playback on older iPhones.
  const vc = (f.vcodec || '').toLowerCase();
  if (vc.includes('avc1') || vc.includes('h264')) return 4;
  if (vc.includes('hev1') || vc.includes('hvc1') || vc.includes('hevc')) return 3;
  if (vc.includes('vp09') || vc.includes('vp9')) return 2;
  if (vc.includes('av01') || vc.includes('av1')) return 1;
  return 0;
}

export function getBestAudioFormat(formats = []) {
  const audios = formats.filter(f => f.acodec && f.acodec !== 'none');
  if (!audios.length) return null;

  audios.sort((a, b) => {
    const codecA = (a.acodec || '').toLowerCase();
    const codecB = (b.acodec || '').toLowerCase();
    const compatibleA = codecA.startsWith('mp4a') || codecA.includes('aac') ? 1 : 0;
    const compatibleB = codecB.startsWith('mp4a') || codecB.includes('aac') ? 1 : 0;
    if (compatibleA !== compatibleB) return compatibleB - compatibleA;
    const abrA = a.abr || a.tbr || 0;
    const abrB = b.abr || b.tbr || 0;
    if (abrB !== abrA) return abrB - abrA;
    const szA = a.filesize || a.filesize_approx || 0;
    const szB = b.filesize || b.filesize_approx || 0;
    return szB - szA;
  });

  return audios[0];
}

export function calculateEstimatedSize(videoFmt, audioFmt, durationSeconds) {
  let videoBytes = videoFmt.filesize || videoFmt.filesize_approx || 0;
  let audioBytes = (audioFmt?.filesize || audioFmt?.filesize_approx || 0);

  if (videoFmt.acodec && videoFmt.acodec !== 'none') {
    audioBytes = 0;
  }

  if (videoBytes > 0) {
    const total = videoBytes + audioBytes;
    return `~${fmtBytes(total)}`;
  }

  const dur = Number(durationSeconds || 0);
  const vBitrate = videoFmt.tbr || videoFmt.vbr || 0;
  const aBitrate = (audioBytes === 0 && videoFmt.acodec && videoFmt.acodec !== 'none') ? 0 : (audioFmt?.abr || 128);

  if (dur > 0 && vBitrate > 0) {
    const totalKbps = vBitrate + aBitrate;
    const estBytes = (totalKbps * 1000 / 8) * dur;
    if (estBytes > 0) {
      return `~${fmtBytes(estBytes)}`;
    }
  }

  return 'Size: Unknown';
}

/**
 * Builds dynamically validated quality tiers strictly from actual source formats.
 */
export function buildQualityTiers(formats = [], durationSeconds = 0) {
  const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.width && f.height);
  const bestAudio = getBestAudioFormat(formats);

  const tierGroups = new Map();

  for (const f of videoFormats) {
    const tier = getResolutionTier(f.width, f.height);
    if (!tier) continue;

    if (!tierGroups.has(tier.id)) {
      tierGroups.set(tier.id, { tier, formats: [] });
    }
    tierGroups.get(tier.id).formats.push(f);
  }

  const resultTiers = [];

  for (const [tierId, group] of tierGroups.entries()) {
    group.formats.sort((a, b) => {
      const pixelsA = (a.width || 0) * (a.height || 0);
      const pixelsB = (b.width || 0) * (b.height || 0);
      if (pixelsA !== pixelsB) return pixelsB - pixelsA;
      const codecPreference = scoreVideoFormat(b) - scoreVideoFormat(a);
      if (codecPreference) return codecPreference;
      if ((a.fps || 0) !== (b.fps || 0)) return (b.fps || 0) - (a.fps || 0);
      return (b.tbr || b.vbr || 0) - (a.tbr || a.vbr || 0);
    });
    const bestVid = group.formats[0];
    const isDirect = Boolean(bestVid.acodec && bestVid.acodec !== 'none');
    const selectedAudio = isDirect ? null : bestAudio;
    const compatibleAudio = isAac(bestVid) ? bestVid : bestAudio && isAac(bestAudio) ? bestAudio : null;
    const bestPixels = (bestVid.width || 0) * (bestVid.height || 0);
    const compatibleVideo = group.formats.find(format => {
      const container = String(format.ext || format.video_ext || '').toLowerCase();
      const aspect = (format.width || 0) / (format.height || 1);
      const bestAspect = (bestVid.width || 0) / (bestVid.height || 1);
      const sameOrientation = (format.height > format.width) === (bestVid.height > bestVid.width);
      const similarAspect = Math.abs(aspect - bestAspect) / Math.max(bestAspect, 0.001) <= 0.03;
      return isH264(format) && container === 'mp4' && isSDR(format)
        && sameOrientation && similarAspect
        && (format.width || 0) * (format.height || 0) >= bestPixels * 0.95
        && (isAac(format) || (format.acodec === 'none' && (compatibleAudio || !bestAudio)));
    });
    const compatibleSource = compatibleVideo && (compatibleAudio || (!bestAudio && compatibleVideo.acodec === 'none'))
      ? {
          videoFormatId: compatibleVideo.format_id,
          audioFormatId: isAac(compatibleVideo) || !compatibleAudio ? null : compatibleAudio.format_id,
          resolution: `${compatibleVideo.width} × ${compatibleVideo.height}`,
          width: compatibleVideo.width,
          height: compatibleVideo.height,
          fps: compatibleVideo.fps ? `${Math.round(compatibleVideo.fps)} FPS` : 'FPS: Unknown',
          codec: formatVideoCodec(compatibleVideo.vcodec),
          acodec: compatibleAudio ? formatAudioCodec(compatibleAudio.acodec) : 'None',
          isDirectProgressive: Boolean(isAac(compatibleVideo)),
        }
      : null;

    const fpsStr = bestVid.fps ? `${Math.round(bestVid.fps)} FPS` : 'FPS: Unknown';
    const vcodecStr = formatVideoCodec(bestVid.vcodec) || 'Unknown';
    const acodecStr = isDirect
      ? (formatAudioCodec(bestVid.acodec) || 'Audio')
      : (bestAudio ? formatAudioCodec(bestAudio.acodec) || 'AAC' : 'None');
    
    const audioLabel = selectedAudio && selectedAudio.abr
      ? `${Math.round(selectedAudio.abr)}kbps ${acodecStr}`
      : acodecStr;

    const estSize = calculateEstimatedSize(bestVid, selectedAudio, durationSeconds);

    resultTiers.push({
      id: tierId,
      tierName: tierId,
      label: group.tier.label,
      resolutionClass: group.tier.resolutionClass,
      resolution: `${bestVid.width} × ${bestVid.height}`,
      width: bestVid.width,
      height: bestVid.height,
      isPortrait: group.tier.isPortrait,
      fps: fpsStr,
      fpsRaw: bestVid.fps || null,
      codec: vcodecStr,
      vcodecRaw: bestVid.vcodec,
      acodec: acodecStr,
      audio: audioLabel,
      bitrate: bestVid.tbr || bestVid.vbr ? `${Math.round(bestVid.tbr || bestVid.vbr)} kbps` : null,
      estimatedSize: estSize,
      videoFormatId: bestVid.format_id,
      audioFormatId: selectedAudio ? selectedAudio.format_id : null,
      isDirectProgressive: isDirect,
      sourceCompatibility: compatibleSource ? 'compatible' : 'limited',
      iosCompatibleSource: compatibleSource,
      formatVariants: group.formats.map(format => ({
        formatId: format.format_id,
        width: format.width,
        height: format.height,
        fps: format.fps || null,
        vcodec: format.vcodec,
        acodec: format.acodec,
        ext: format.ext,
        dynamicRange: format.dynamic_range || null,
        profile: format.profile || null,
        pixelFormat: format.pix_fmt || null,
      })),
      directUrl: bestVid.url || null,
      ext: bestVid.ext || 'mp4',
      order: group.tier.order,
      tag: group.tier.tag,
      isHighest: false,
    });
  }

  // Sort highest resolution first
  resultTiers.sort((a, b) => b.order - a.order);

  if (resultTiers.length > 0) {
    resultTiers[0].isHighest = true;
    resultTiers[0].tag = `MAX ${resultTiers[0].resolutionClass}`;
  }

  // Audio Only tier
  if (bestAudio) {
    const audioSize = (bestAudio.filesize || bestAudio.filesize_approx)
      ? fmtBytes(bestAudio.filesize || bestAudio.filesize_approx)
      : (durationSeconds && bestAudio.abr ? fmtBytes((bestAudio.abr * 1000 / 8) * durationSeconds) : 'Size: Unknown');
    const audioCodec = formatAudioCodec(bestAudio.acodec) || 'MP3';
    const abr = bestAudio.abr ? `${Math.round(bestAudio.abr)}kbps` : 'Audio';

    resultTiers.push({
      id: 'audio-320',
      tierName: 'audio',
      label: `Audio Only (${abr} ${audioCodec})`,
      resolutionClass: 'Audio',
      resolution: 'Audio Only',
      width: null,
      height: null,
      isPortrait: false,
      fps: 'N/A',
      codec: audioCodec,
      acodec: audioCodec,
      audio: abr,
      bitrate: bestAudio.abr ? `${Math.round(bestAudio.abr)} kbps` : null,
      estimatedSize: audioSize,
      videoFormatId: null,
      audioFormatId: bestAudio.format_id,
      isDirectProgressive: false,
      directUrl: bestAudio.url || null,
      ext: 'mp3',
      order: -99,
      tag: 'MP3',
      isHighest: false,
    });
  }

  return resultTiers;
}

function getTierFormatArg(tier) {
  if (!tier?.videoFormatId) return 'bestvideo+bestaudio/best';
  if (tier.isDirectProgressive) return tier.videoFormatId;
  if (tier.audioFormatId) return `${tier.videoFormatId}+${tier.audioFormatId}`;
  return `${tier.videoFormatId}+bestaudio/best`;
}

function selectVideoTier(tiers, requestedId) {
  const videoTiers = tiers.filter(tier => tier.id !== 'audio-320');
  return videoTiers.find(tier => tier.id === requestedId) || videoTiers[0] || null;
}

function isValidMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSelectedIOSSource(tier) {
  const source = tier?.iosCompatibleSource;
  if (!source) return null;
  return {
    ...source,
    isDirectProgressive: Boolean(source.isDirectProgressive),
  };
}

async function prepareVideoDownload({ url, qualityId = '4k', outputMode = 'source', onDownloadStarted }, onProgress = () => {}) {
  if (!isValidMediaUrl(url)) throw new Error('Enter a valid http or https video URL.');
  if (!VALID_QUALITY_IDS.has(qualityId)) throw new Error('That video quality is not supported.');
  if (!['source', 'ios-compatible'].includes(outputMode)) throw new Error('That output mode is not supported.');

  const jobId = randomUUID();
  const jobDir = mkdtempSync(join(TEMP_DIR, `job-${jobId}-`));
  try {
    onProgress('analyzing', 3, 'Analyzing available source formats…');
    const [primary] = await ytDlpJsonLines([
      '--dump-json', '--no-playlist', '--no-warnings', '--user-agent', UA, url,
    ]);
    const title = getCaptionTitle(primary, detectPlatform(url).id);
    const tiers = buildQualityTiers(primary.formats || [], primary.duration);
    const tier = selectVideoTier(tiers, qualityId);
    if (!tier) throw new Error('No downloadable video formats were found at that quality.');

    const iosSource = outputMode === 'ios-compatible' ? getSelectedIOSSource(tier) : null;
    const useCompatibleSource = Boolean(iosSource);
    const sourceTier = useCompatibleSource ? iosSource : tier;
    const formatArg = getTierFormatArg(sourceTier);
    const outTemplate = join(jobDir, 'source.%(ext)s');
    const sourceUrl = primary.webpage_url || url;
    const filename = makeVideoFilename(primary, sourceUrl);
    onDownloadStarted?.(filename);
    const args = [
      sourceUrl, '-o', outTemplate, '--no-playlist', '--no-warnings',
      '--user-agent', UA, '--embed-metadata', '-f', formatArg,
      '--merge-output-format', 'mp4', '--remux-video', 'mp4',
    ];

    onProgress('downloading', 8, `Downloading ${sourceTier.resolution} source…`);
    const downloadedPath = await ytDlpDownload(
      args, 'source', false, jobDir,
      (progress, message) => onProgress('downloading', progress, message),
    );
    let input = await probeMediaFile(downloadedPath);
    if (!input.hasVideo || !input.width || !input.height || input.size <= 0) {
      throw new Error('The downloaded file has no valid video stream. Nothing was saved.');
    }
    const expectsAudio = sourceTier.acodec && sourceTier.acodec !== 'None';
    if (expectsAudio && !input.hasAudio) throw new Error('The downloaded file is missing its expected audio stream.');

    onProgress('processing', 91, outputMode === 'ios-compatible' ? 'Preparing iPhone playback…' : 'Preparing MP4 for playback…');
    let outputPath = await makeFastStartMp4(downloadedPath, jobDir, title);
    let output = await probeMediaFile(outputPath);
    let transcoded = false;

    if (outputMode === 'ios-compatible' && !output.iosPlayable) {
      onProgress('converting', 93, 'Converting to iPhone-compatible H.264/AAC…');
      outputPath = await transcodeForIOS(downloadedPath, jobDir, title, input);
      output = await probeMediaFile(outputPath);
      transcoded = true;
      if (!output.iosPlayable) throw new Error('FFmpeg finished, but the result did not pass iPhone playback checks.');
    }

    onProgress('verifying', 98, 'Verifying video, audio, dimensions, and duration…');
    output = await probeMediaFile(outputPath);
    const stat = statSync(outputPath);
    if (!output.hasVideo || !output.width || !output.height || output.duration <= 0 || stat.size <= 0 || output.size <= 0) {
      throw new Error('The final MP4 failed verification because its video stream, dimensions, or file size is invalid.');
    }
    if (expectsAudio && !output.hasAudio) throw new Error('The final MP4 is missing its expected audio stream.');
    if (!String(output.format || '').toLowerCase().includes('mp4')) {
      throw new Error('The final output is not a valid MP4 container.');
    }
    if (input.width !== output.width || input.height !== output.height) {
      throw new Error(`Output dimensions changed unexpectedly (${input.width}×${input.height} to ${output.width}×${output.height}).`);
    }

    const result = {
      jobId,
      jobDir,
      filePath: outputPath,
      filename,
      title,
      qualityId: tier.id,
      outputMode,
      transcoded,
      metadata: {
        source: {
          width: input.width,
          height: input.height,
          fps: input.fps,
          videoCodec: input.videoCodec,
          videoCodecLabel: input.videoCodecLabel,
          audioCodec: input.audioCodec,
          audioCodecLabel: input.audioCodecLabel,
          format: input.format,
          dynamicRange: primary.dynamic_range || 'unknown',
          iosCompatibleSourceAvailable: Boolean(tier.iosCompatibleSource),
        },
        output: {
          width: output.width,
          height: output.height,
          fps: output.fps,
          videoCodec: output.videoCodec,
          audioCodec: output.audioCodec,
          profile: output.profile,
          pixelFormat: output.pixelFormat,
          format: output.format,
          duration: output.duration,
          size: stat.size,
          iosPlayable: output.iosPlayable,
        },
      },
    };
    onProgress('ready', 100, 'Video is ready.');
    return result;
  } catch (error) {
    rmSync(jobDir, { recursive: true, force: true });
    throw error;
  }
}

function defaultOutputMode(req) {
  if (req.body?.device === 'ios') return 'ios-compatible';
  const userAgent = String(req.headers?.['user-agent'] || '');
  const ipadOS = /Macintosh/i.test(userAgent) && req.headers?.['sec-ch-ua-mobile'] === '?1';
  return /iPhone|iPad|iPod/i.test(userAgent) || ipadOS ? 'ios-compatible' : 'source';
}

function setVideoResponseHeaders(res, filePath, filename, metadata, disposition = 'attachment') {
  const stat = statSync(filePath);
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeFilenameHeader(filename)}`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Accept-Ranges', 'bytes');
  // X-Filename must be ASCII-only — use percent-encoded form so the client can decode it
  res.setHeader('X-Filename', encodeURIComponent(filename));
  // All other custom headers are ASCII-safe values already
  res.setHeader('X-Final-Resolution', `${metadata.width || 0}x${metadata.height || 0}`);
  res.setHeader('X-Final-Fps', metadata.fps ? `${metadata.fps} FPS` : 'Unknown');
  res.setHeader('X-Final-Vcodec', (metadata.videoCodec || 'Unknown').replace(/[^\x20-\x7E]/g, '?'));
  res.setHeader('X-Final-Acodec', (metadata.audioCodec || 'None').replace(/[^\x20-\x7E]/g, '?'));
  res.setHeader('X-Final-Size', stat.size);
  res.setHeader('X-iOS-Playable', String(Boolean(metadata.iosPlayable)));
  res.setHeader('X-Transcoded', String(Boolean(metadata.transcoded)));
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Accept-Ranges, X-Filename, X-Final-Resolution, X-Final-Fps, X-Final-Vcodec, X-Final-Acodec, X-Final-Size, X-iOS-Playable, X-Transcoded');
  return stat;
}

function startNativeAttachment(res, filename) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  res.status(200);
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeFilenameHeader(filename)}`);
  res.setHeader('Cache-Control', 'no-store');
  // Send attachment headers as soon as the source title/filename is known so
  // the browser's native download UI starts before the server finishes fetching.
  res.flushHeaders();
}

function streamVideoFile(req, res, filePath, filename, metadata, disposition = 'attachment') {
  const stat = setVideoResponseHeaders(res, filePath, filename, metadata, disposition);
  const rangeHeader = req.headers.range;
  if (!rangeHeader) {
    res.setHeader('Content-Length', stat.size);
    createReadStream(filePath).pipe(res);
    return;
  }

  const match = String(rangeHeader).match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    res.setHeader('Content-Range', `bytes */${stat.size}`);
    res.status(416).end();
    return;
  }
  const start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
  const end = match[1] ? Math.min(Number(match[2] || stat.size - 1), stat.size - 1) : stat.size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= stat.size) {
    res.setHeader('Content-Range', `bytes */${stat.size}`);
    res.status(416).end();
    return;
  }
  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
  res.setHeader('Content-Length', end - start + 1);
  createReadStream(filePath, { start, end }).pipe(res);
}

function removeDownloadJob(jobId) {
  const job = DOWNLOAD_JOBS.get(jobId);
  if (!job) return;
  if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
  if (job.jobDir && existsSync(job.jobDir)) rmSync(job.jobDir, { recursive: true, force: true });
  DOWNLOAD_JOBS.delete(jobId);
}

function expireDownloadJob(job, delay = JOB_TTL_MS) {
  job.cleanupTimer = setTimeout(() => removeDownloadJob(job.id), delay);
  job.cleanupTimer.unref?.();
}

export function isIOSPlayable(metadata) {
  const video = metadata?.streams?.find(stream => stream.codec_type === 'video');
  const audio = metadata?.streams?.find(stream => stream.codec_type === 'audio');
  const formatName = String(metadata?.format?.format_name || '').toLowerCase();
  const transfer = String(video?.color_transfer || '').toLowerCase();
  const primaries = String(video?.color_primaries || '').toLowerCase();
  const hdr = transfer.includes('smpte2084') || transfer.includes('arib-std-b67') || primaries.includes('bt2020');
  return Boolean(video && (formatName.includes('mp4') || formatName.includes('mov'))
    && video.codec_name === 'h264' && (!audio || audio.codec_name === 'aac')
    && video.pix_fmt === 'yuv420p' && !hdr);
}

function probeMediaFile(filePath) {
  return new Promise((resolve, reject) => {
    if (!existsSync(FFPROBE) || !existsSync(filePath)) {
      return reject(new Error(`ffprobe is unavailable or the output file is missing (${FFPROBE}).`));
    }
    const args = [
      '-v', 'error', '-show_entries',
      'format=format_name,duration,size:stream=index,codec_type,codec_name,profile,pix_fmt,width,height,avg_frame_rate,r_frame_rate,color_transfer,color_primaries,color_space',
      '-of', 'json', filePath,
    ];
    const proc = spawn(FFPROBE, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', data => { stdout += data.toString(); });
    proc.stderr.on('data', data => { stderr += data.toString(); });
    proc.on('error', error => reject(new Error(`Could not run ffprobe: ${error.message}`)));
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`ffprobe could not read the output: ${stderr.trim().slice(-400)}`));
      try {
        const metadata = JSON.parse(stdout);
        const video = metadata.streams?.find(stream => stream.codec_type === 'video') || null;
        const audio = metadata.streams?.find(stream => stream.codec_type === 'audio') || null;
        const fps = video?.avg_frame_rate || video?.r_frame_rate || '';
        const [fpsNumerator, fpsDenominator] = fps.split('/').map(Number);
        const frameRate = fpsNumerator && fpsDenominator ? fpsNumerator / fpsDenominator : null;
        const result = {
          format: metadata.format?.format_name || null,
          duration: Number(metadata.format?.duration || 0),
          size: Number(metadata.format?.size || statSync(filePath).size),
          hasVideo: Boolean(video),
          hasAudio: Boolean(audio),
          videoCodec: video?.codec_name || null,
          videoCodecLabel: formatVideoCodec(video?.codec_name) || null,
          audioCodec: audio?.codec_name || null,
          audioCodecLabel: formatAudioCodec(audio?.codec_name) || null,
          profile: video?.profile || null,
          pixelFormat: video?.pix_fmt || null,
          width: video?.width || null,
          height: video?.height || null,
          fps: frameRate ? Math.round(frameRate * 100) / 100 : null,
          colorTransfer: video?.color_transfer || null,
          colorPrimaries: video?.color_primaries || null,
        };
        result.iosPlayable = isIOSPlayable(metadata);
        resolve(result);
      } catch (error) {
        reject(new Error(`Could not parse ffprobe output: ${error.message}`));
      }
    });
  });
}

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath || !existsSync(ffmpegPath)) return reject(new Error('FFmpeg is unavailable on this server.'));
    const proc = spawn(ffmpegPath, ['-hide_banner', '-nostdin', ...args], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', data => { stderr += data.toString(); });
    proc.on('error', error => reject(new Error(`Could not run FFmpeg: ${error.message}`)));
    proc.on('close', code => code === 0
      ? resolve()
      : reject(new Error(`FFmpeg failed: ${stderr.trim().slice(-700) || `exit ${code}`}`)));
  });
}

function inspectMediaFile(filePath) {
  return probeMediaFile(filePath).catch(error => {
    console.error('[FFPROBE ERROR]', error.message);
    return null;
  });
}

async function makeFastStartMp4(filePath, jobDir, title) {
  const outputPath = join(jobDir, 'faststart.mp4');
  await runFFmpeg(['-y', '-i', filePath, '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '0', '-c', 'copy', '-movflags', '+faststart', '-metadata', `title=${title}`, outputPath]);
  return outputPath;
}

async function transcodeForIOS(filePath, jobDir, title, sourceMetadata) {
  const outputPath = join(jobDir, 'iphone-compatible.mp4');
  const hdr = /smpte2084|arib-std-b67/i.test(String(sourceMetadata?.colorTransfer || ''))
    || /bt2020/i.test(String(sourceMetadata?.colorPrimaries || ''));
  const videoCopySafe = sourceMetadata?.videoCodec === 'h264'
    && sourceMetadata?.pixelFormat === 'yuv420p'
    && !hdr;
  const args = [
    '-y', '-threads', '1', '-i', filePath, '-map', '0:v:0', '-map', '0:a:0?',
  ];
  if (videoCopySafe) {
    // Already H.264/yuv420p — just remux, no encode needed (fastest path)
    args.push('-c:v', 'copy');
  } else {
    if (hdr) {
      // HDR→SDR tonemapping (rare path)
      args.push(
        '-vf', 'zscale=transfer=linear:npl=100,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=primaries=bt709:transfer=bt709:matrix=bt709:range=tv,format=yuv420p',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      );
    }
    // ultrafast preset = ~5-8x faster than medium; crf 18 = near-lossless quality (same as original)
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '1');
  }
  // Check if audio already AAC — if so, copy it too (no re-encode at all in best case)
  const audioAlreadyAac = sourceMetadata?.audioCodec === 'aac';
  if (audioAlreadyAac && videoCopySafe) {
    args.push('-c:a', 'copy');
  } else {
    args.push('-c:a', 'aac', '-b:a', '192k');
  }
  args.push('-movflags', '+faststart', '-metadata', `title=${title}`, outputPath);
  await runFFmpeg(args);
  return outputPath;
}

function findFile(prefix, isAudio = false, directory = TEMP_DIR) {
  try {
    const all = readdirSync(directory);
    const valid = all.filter(f => 
      f.startsWith(prefix) && 
      !f.endsWith('.part') && 
      !f.endsWith('.ytdl') && 
      !f.endsWith('.temp')
    );

    if (!valid.length) return null;

    if (isAudio) {
      const audioMatch = valid.find(f => /\.(mp3|m4a|aac|opus|ogg|wav)$/i.test(f));
      if (audioMatch) return join(directory, audioMatch);
    } else {
      const vidMatch = valid.find(f => /\.(mp4|mkv|webm|mov)$/i.test(f));
      if (vidMatch) return join(directory, vidMatch);
    }

    const sorted = valid
      .map(f => {
        try { return { name: f, size: statSync(join(directory, f)).size }; }
        catch { return { name: f, size: 0 }; }
      })
      .sort((a, b) => b.size - a.size);

    return sorted.length > 0 ? join(directory, sorted[0].name) : null;
  } catch {
    return null;
  }
}

function ytDlpJsonLines(args) {
  return new Promise((resolve, reject) => {
    const finalArgs = [...args];
    if (ffmpegPath && existsSync(ffmpegPath)) {
      finalArgs.unshift('--ffmpeg-location', ffmpegPath);
    }
    if (COOKIES_PATH && existsSync(COOKIES_PATH)) {
      finalArgs.unshift('--cookies', COOKIES_PATH);
    }
    finalArgs.unshift('--extractor-args', 'youtube:player_client=android,web');
    const proc = spawn(YT_DLP, finalArgs, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => (stdout += d.toString()));
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.on('close', code => {
      const lines = stdout.trim().split('\n').filter(Boolean);
      const objects = [];
      for (const line of lines) {
        try { objects.push(JSON.parse(line)); } catch (_) {}
      }
      
      if (objects.length > 0) {
        resolve(objects);
      } else if (code !== 0) {
        reject(new Error(stderr.trim() || `yt-dlp exited ${code}`));
      } else {
        reject(new Error('yt-dlp returned no metadata'));
      }
    });
    proc.on('error', error => reject(new Error(
      error.code === 'ENOENT'
        ? 'yt-dlp was not found. Install it or set YT_DLP_PATH to its executable.'
        : `Could not start yt-dlp: ${error.message}`
    )));
  });
}

function ytDlpDownload(args, prefix, isAudio = false, directory = TEMP_DIR, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const finalArgs = ['--newline', ...args];
    if (ffmpegPath && existsSync(ffmpegPath)) {
      finalArgs.unshift('--ffmpeg-location', ffmpegPath);
    }
    if (COOKIES_PATH && existsSync(COOKIES_PATH)) {
      finalArgs.unshift('--cookies', COOKIES_PATH);
    }
    finalArgs.unshift('--extractor-args', 'youtube:player_client=android,web');

    const proc = spawn(YT_DLP, finalArgs, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stderr = '';
    let progressBuffer = '';
    proc.stderr.on('data', d => {
      const chunk = d.toString();
      stderr += chunk;
      progressBuffer += chunk;
      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() || '';
      for (const line of lines) {
        const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (match) onProgress(10 + Math.round(Number(match[1]) * 0.72), `Downloading source (${Math.round(Number(match[1]))}%)`);
      }
      process.stderr.write(d);
    });
    proc.stdout.on('data', () => {});
    proc.on('error', error => reject(new Error(
      error.code === 'ENOENT'
        ? 'yt-dlp was not found. Install it or set YT_DLP_PATH to its executable.'
        : `Could not start yt-dlp: ${error.message}`
    )));
    proc.on('close', code => {
      const candidate = findFile(prefix, isAudio, directory);
      if (candidate && existsSync(candidate)) {
        try {
          const sz = statSync(candidate).size;
          if (sz > 5000) return resolve(candidate);
        } catch (_) {}
      }

      if (code !== 0) {
        return reject(new Error(parseError(stderr) || `yt-dlp error (code ${code})`));
      }
      
      if (candidate && existsSync(candidate)) return resolve(candidate);
      reject(new Error('File not found after download. Please try a different quality or link.'));
    });
  });
}

function parseError(raw = '') {
  const s = raw.toLowerCase();
  if (s.includes('yt-dlp not found') || s.includes('not recognized')) return 'yt-dlp not found. Please install yt-dlp.';
  if (s.includes('login') || s.includes('cookie') || s.includes('sign in')) return 'This media requires account login. Only public content is supported.';
  if (s.includes('private') || s.includes('not available')) return 'This content is private or unavailable.';
  if (s.includes('no video') || s.includes('no media') || s.includes('not supported')) return 'No downloadable media found at this URL.';
  if (s.includes('rate limit') || s.includes('429')) return 'Rate-limited by platform. Wait a minute and try again.';
  if (s.includes('geo') || s.includes('not available in your country')) return 'This media is geo-blocked in your region.';
  if (s.includes('unsupported url')) return 'Unsupported URL. Please paste a valid video or reel link.';
  if (raw.trim()) return raw.trim().split('\n').pop().slice(0, 180);
  return 'Download failed. Try a different format.';
}

function fmtDur(s) {
  if (!s) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`;
}

function fmtCount(n) {
  if (!n) return null;
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
  return String(n);
}

function fmtBytes(b) {
  if (!b) return null;
  const mb = b / 1024 / 1024;
  return mb >= 1024 ? `${(mb/1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

function detectPlatform(url = '') {
  const u = url.toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am'))
    return { id:'instagram', name:'Instagram', gradient:'linear-gradient(135deg,#fd1d1d,#e1306c,#833ab4)' };
  if (u.includes('youtube.com') || u.includes('youtu.be'))
    return { id:'youtube', name:'YouTube', gradient:'linear-gradient(135deg,#ff0000,#cc0000)' };
  if (u.includes('facebook.com') || u.includes('fb.watch') || u.includes('fb.com'))
    return { id:'facebook', name:'Facebook', gradient:'linear-gradient(135deg,#0064e0,#00c6ff)' };
  if (u.includes('tiktok.com'))
    return { id:'tiktok', name:'TikTok', gradient:'linear-gradient(135deg,#010101,#00f2fe)' };
  if (u.includes('twitter.com') || u.includes('x.com'))
    return { id:'twitter', name:'Twitter/X', gradient:'linear-gradient(135deg,#1DA1F2,#14171A)' };
  return { id:'unknown', name:'Universal', gradient:'linear-gradient(135deg,#8b5cf6,#3b82f6)' };
}

function detectMediaType(url = '', info = {}) {
  const u = url.toLowerCase();
  if (u.includes('/reel/') || u.includes('fb.watch') || u.includes('/reels/')) return 'Reel';
  if (u.includes('/shorts/')) return 'Short';
  if (info._type === 'playlist' || info.entries?.length > 1) return 'Carousel';
  if (u.includes('/p/')) return 'Post';
  return 'Video';
}

// ─── POST /api/info ───────────────────────────────────────────────────────────
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });
  console.log(`\n--- [INFO REQUEST] ${url} ---`);

  try {
    let infoObjects;
    try {
      infoObjects = await ytDlpJsonLines([
        '--dump-json',
        '--no-warnings',
        '--user-agent', UA,
        '--yes-playlist',
        url,
      ]);
    } catch (_) {
      infoObjects = await ytDlpJsonLines([
        '--dump-json',
        '--no-warnings',
        '--user-agent', UA,
        '--no-playlist',
        url,
      ]);
    }

    const primary = infoObjects[0] || {};
    const isCarousel = infoObjects.length > 1;

    // Real quality tiers built from actual formats
    const qualities = buildQualityTiers(primary.formats || [], primary.duration);
    console.log(`Available Source Tiers for "${primary.title || 'media'}":`);
    qualities.forEach(q => console.log(`  - ${q.label}: ${q.resolution} · ${q.fps} · ${q.codec} · ${q.estimatedSize}`));

    // Direct stream link discovery
    const directFormat = (primary.formats || [])
      .slice()
      .reverse()
      .find(f => f.url && f.vcodec !== 'none' && f.acodec !== 'none') || 
      (primary.formats || []).slice().reverse().find(f => f.url && f.vcodec !== 'none') ||
      primary.formats?.[0];

    const directUrl = primary.url || directFormat?.url || '';

    // Build carousel items with accurate per-slide metadata
    const carouselItems = isCarousel
      ? infoObjects.map((entry, i) => {
          const hasVideo = entry.vcodec && entry.vcodec !== 'none';
          const height   = entry.height || 0;
          const width    = entry.width  || 0;
          const slideDirect = entry.url || entry.thumbnail || entry.thumbnails?.[0]?.url || '';
          const slideQualities = hasVideo ? buildQualityTiers(entry.formats || [], entry.duration) : [];
          return {
            id:         i + 1,
            type:       hasVideo ? 'video' : 'photo',
            title:      entry.title || `Slide ${i + 1}`,
            resolution: width && height ? `${width}×${height}` : 'N/A',
            fps:        entry.fps ? `${Math.round(entry.fps)} fps` : '–',
            size:       fmtBytes(entry.filesize || entry.filesize_approx) || '–',
            thumb:      entry.thumbnail || entry.thumbnails?.[0]?.url || primary.thumbnail || '',
            duration:   hasVideo ? fmtDur(entry.duration) : 'Photo',
            url:        entry.webpage_url || url,
            directUrl:  slideDirect,
            qualities:  slideQualities,
          };
        })
      : null;

    // Best thumbnail
    const thumb = (() => {
      const thumbs = primary.thumbnails;
      if (thumbs?.length) {
        const sorted = [...thumbs].sort((a, b) => ((b.width||0)*(b.height||0)) - ((a.width||0)*(a.height||0)));
        return sorted[0]?.url || primary.thumbnail || '';
      }
      return primary.thumbnail || '';
    })();

    const metadata = {
      url,
      title:        primary.title || 'OmniStream Video',
      author:       primary.uploader || primary.channel || primary.creator || 'Creator',
      authorUrl:    primary.uploader_url || primary.channel_url || '',
      duration:     fmtDur(primary.duration),
      views:        primary.view_count ? `${fmtCount(primary.view_count)} views` : null,
      likes:        primary.like_count ? fmtCount(primary.like_count) : null,
      uploadDate:   primary.upload_date
        ? `${primary.upload_date.slice(0,4)}-${primary.upload_date.slice(4,6)}-${primary.upload_date.slice(6,8)}`
        : null,
      thumbnailUrl: thumb,
      description:  (primary.description || '').slice(0, 500),
      platform:     detectPlatform(url),
      mediaType:    detectMediaType(url, { entries: infoObjects }),
      isCarousel,
      carouselItems,
      qualities:    qualities,
      directUrl:    directUrl,
      extractor:    primary.extractor_key || primary.extractor || '',
      id:           primary.id || '',
    };

    res.json({ success: true, metadata });
  } catch (err) {
    console.error('[INFO ERROR]', err.message);
    res.status(500).json({ error: parseError(err.message) });
  }
});

// ─── Verified download jobs ───────────────────────────────────────────────────
app.post('/api/download/jobs', (req, res) => {
  const { url, qualityId = '4k', outputMode } = req.body || {};
  if (!isValidMediaUrl(url)) return res.status(400).json({ error: 'Enter a valid http or https video URL.' });
  if (!VALID_QUALITY_IDS.has(qualityId)) return res.status(400).json({ error: 'That video quality is not supported.' });

  const id = randomUUID();
  const job = {
    id,
    status: 'analyzing',
    stage: 'analyzing',
    progress: 2,
    message: 'Starting download preparation…',
    outputMode: ['source', 'ios-compatible'].includes(outputMode) ? outputMode : defaultOutputMode(req),
    createdAt: Date.now(),
    filePath: null,
    jobDir: null,
  };
  DOWNLOAD_JOBS.set(id, job);
  res.status(202).json({ jobId: id, status: job.status });

  prepareVideoDownload({ url, qualityId, outputMode: job.outputMode }, (stage, progress, message) => {
    if (stage !== 'ready') job.status = stage;
    job.stage = stage;
    job.progress = progress;
    job.message = message;
  }).then(result => {
    Object.assign(job, result, { id, status: 'ready', stage: 'ready', progress: 100, message: 'Verified and ready.' });
    expireDownloadJob(job);
  }).catch(error => {
    job.status = 'failed';
    job.stage = 'failed';
    job.error = parseError(error.message);
    job.message = job.error;
    expireDownloadJob(job, 5 * 60 * 1000);
  });
});

app.get('/api/download/jobs/:jobId', (req, res) => {
  const id = req.params.jobId;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid download job ID.' });
  const job = DOWNLOAD_JOBS.get(id);
  if (!job) return res.status(404).json({ error: 'Download job expired or not found.' });
  res.json({
    jobId: id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    error: job.error || null,
    filename: job.filename || null,
    metadata: job.metadata || null,
    transcoded: Boolean(job.transcoded),
    outputMode: job.outputMode,
  });
});

app.get('/api/download/jobs/:jobId/file', (req, res) => {
  const id = req.params.jobId;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid download job ID.' });
  const job = DOWNLOAD_JOBS.get(id);
  if (!job || job.status !== 'ready' || !job.filePath || !existsSync(job.filePath)) {
    return res.status(409).json({ error: 'This video is not ready yet. Wait for verification to finish.' });
  }
  const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
  const metadata = { ...job.metadata.output, transcoded: job.transcoded };
  streamVideoFile(req, res, job.filePath, job.filename, metadata, disposition);
});

// ─── GET /api/download/jobs/:jobId/download (mobile-friendly redirect) ────────
// Opens the file URL so Safari/Chrome mobile show their native download bar
app.get('/api/download/jobs/:jobId/download', (req, res) => {
  const id = req.params.jobId;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid download job ID.' });
  const job = DOWNLOAD_JOBS.get(id);
  if (!job) return res.status(404).json({ error: 'Download job expired or not found.' });
  if (job.status !== 'ready' || !job.filePath || !existsSync(job.filePath)) {
    return res.status(409).json({ error: 'This video is not ready yet.' });
  }
  // Stream directly with attachment disposition — mobile browsers show native download UI
  const metadata = { ...job.metadata.output, transcoded: job.transcoded };
  streamVideoFile(req, res, job.filePath, job.filename, metadata, 'attachment');
});

// ─── POST /api/download (existing desktop-compatible endpoint) ───────────────
app.post('/api/download', async (req, res) => {
  const { url, qualityId = '4k', audioOnly = false, outputMode } = req.body || {};
  const isAudio = Boolean(audioOnly) || qualityId === 'audio-320' || qualityId === 'audio';
  if (!isValidMediaUrl(url)) return res.status(400).json({ error: 'Enter a valid http or https video URL.' });
  let jobDir = null;
  try {
    if (isAudio) {
      const [primary] = await ytDlpJsonLines(['--dump-json', '--no-playlist', '--no-warnings', '--user-agent', UA, url]);
      jobDir = mkdtempSync(join(TEMP_DIR, 'audio-'));
      const args = [url, '-o', join(jobDir, 'audio.%(ext)s'), '--no-playlist', '--no-warnings', '--user-agent', UA, '-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0'];
      const filePath = await ytDlpDownload(args, 'audio', true, jobDir);
      const probe = await probeMediaFile(filePath);
      if (!probe.hasAudio || probe.size <= 0) throw new Error('The output does not contain a valid audio stream.');
      const stat = statSync(filePath);
      const filename = `${sanitizeFilename(getCaptionTitle(primary, detectPlatform(url).id), 'audio')}.mp3`;
      const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeFilenameHeader(filename)}`);
      res.setHeader('Content-Length', stat.size);
      return createReadStream(filePath).pipe(res).on('close', () => rmSync(jobDir, { recursive: true, force: true }));
    }

    // Fast path: If the media format has a direct stream URL (e.g. Instagram progressive MP4),
    // stream it directly chunk-by-chunk to the user with zero disk usage and zero FFmpeg overhead!
    try {
      const [primary] = await ytDlpJsonLines(['--dump-json', '--no-playlist', '--no-warnings', '--user-agent', UA, url]);
      const direct = primary.url || (primary.formats || []).slice().reverse().find(f => f.url && f.vcodec !== 'none' && f.acodec !== 'none')?.url;
      if (direct && !isAudio) {
        console.log(`[DIRECT STREAM] Proxying CDN stream for ${primary.title || 'media'}`);
        const cdnRes = await fetch(direct, { headers: { 'User-Agent': UA } });
        if (cdnRes.ok) {
          const filename = makeVideoFilename(primary, url);
          const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeFilenameHeader(filename)}`);
          const len = cdnRes.headers.get('content-length');
          if (len) res.setHeader('Content-Length', len);
          res.setHeader('X-Filename', encodeFilenameHeader(filename));
          res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, X-Filename');
          return Readable.fromWeb(cdnRes.body).pipe(res);
        }
      }
    } catch (directErr) {
      console.warn('[DIRECT STREAM FALLBACK]', directErr.message);
    }

    const mode = ['source', 'ios-compatible'].includes(outputMode) ? outputMode : defaultOutputMode(req);
    const result = await prepareVideoDownload({ url, qualityId, outputMode: mode });
    jobDir = result.jobDir;
    streamVideoFile(req, res, result.filePath, result.filename, { ...result.metadata.output, transcoded: result.transcoded }, 'attachment');
    res.on('close', () => rmSync(jobDir, { recursive: true, force: true }));
  } catch (error) {
    if (jobDir && existsSync(jobDir)) rmSync(jobDir, { recursive: true, force: true });
    console.error('[DOWNLOAD ERROR]', error.message);
    if (!res.headersSent) res.status(500).json({ error: parseError(error.message) });
    else res.destroy(error);
  }
});

// ─── GET /api/stream (Native direct browser download) ──────────────────────────
app.get('/api/stream', async (req, res) => {
  const { url, qualityId = '4k', outputMode } = req.query;
  if (!isValidMediaUrl(url)) return res.status(400).send('Enter a valid http or https video URL.');
  if (!VALID_QUALITY_IDS.has(qualityId)) return res.status(400).send('That video quality is not supported.');
  let jobDir = null;
  let attachmentStarted = false;
  try {
    const result = await prepareVideoDownload({
      url,
      qualityId,
      outputMode: ['source', 'ios-compatible'].includes(outputMode) ? outputMode : defaultOutputMode(req),
      onDownloadStarted: filename => {
        if (!attachmentStarted && !res.destroyed) {
          startNativeAttachment(res, filename);
          attachmentStarted = true;
        }
      },
    });
    jobDir = result.jobDir;
    if (!attachmentStarted) startNativeAttachment(res, result.filename);
    createReadStream(result.filePath).pipe(res);
    res.on('close', () => rmSync(jobDir, { recursive: true, force: true }));
  } catch (err) {
    console.error('[NATIVE STREAM ERR]', err.message);
    if (jobDir && existsSync(jobDir)) rmSync(jobDir, { recursive: true, force: true });
    if (!res.headersSent) res.status(500).send(parseError(err.message));
    else res.destroy(err);
  }
});

// ─── POST /api/carousel-download ─────────────────────────────────────────────
app.post('/api/carousel-download', async (req, res) => {
  const { url, slideIndex = 0, qualityId = '4k' } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  const isAudio  = qualityId === 'audio-320';
  const prefix   = `slide_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  const outTmpl  = join(TEMP_DIR, `${prefix}.%(ext)s`);
  const slideNum = slideIndex + 1;

  console.log(`[CAROUSEL-DL] slide=${slideNum} quality=${qualityId} url=${url}`);

  const args = [
    url,
    '-o', outTmpl,
    '--no-warnings',
    '--user-agent', UA,
    '--playlist-items', String(slideNum),
  ];

  try {
    let formatArg = '';
    if (isAudio) {
      formatArg = 'bestaudio/best';
    } else {
      const entries = await ytDlpJsonLines([
        '--dump-json', '--yes-playlist', '--no-warnings', '--user-agent', UA, url,
      ]);
      const entry = entries[slideNum - 1];
      if (!entry) return res.status(404).json({ error: `Carousel slide ${slideNum} was not found.` });
      const tiers = buildQualityTiers(entry.formats || [], entry.duration);
      const selectedTier = selectVideoTier(tiers, qualityId);
      if (selectedTier) {
        formatArg = getTierFormatArg(selectedTier);
      } else if (entry.vcodec && entry.vcodec !== 'none') {
        formatArg = 'bestvideo+bestaudio/best';
      }
    }
    if (isAudio) {
      args.push('-f', formatArg, '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (formatArg) {
      args.push('-f', formatArg, '--merge-output-format', 'mp4', '--remux-video', 'mp4');
    }

    const filePath = await ytDlpDownload(args, prefix, isAudio);
    const fileExt  = extname(filePath).replace('.','').toLowerCase() || 'mp4';
    const stat     = statSync(filePath);
    const verified = ['mp4', 'mkv', 'webm', 'mov'].includes(fileExt)
      ? await inspectMediaFile(filePath)
      : null;
    const mime     = ['jpg','jpeg','png','webp'].includes(fileExt)
      ? (fileExt === 'jpg' ? 'image/jpeg' : `image/${fileExt}`)
      : ['mp3','m4a','aac'].includes(fileExt) ? 'audio/mpeg' : 'video/mp4';

    const dlName = `slide_${slideNum}.${fileExt}`;
    res.setHeader('Content-Disposition', `attachment; filename="${dlName}"; filename*=UTF-8''${encodeURIComponent(dlName)}`);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size);
    if (verified && verified.width) {
      res.setHeader('X-Final-Resolution', `${verified.width}×${verified.height}`);
      res.setHeader('X-Final-Fps', verified.fps ? `${verified.fps} FPS` : 'Unknown');
      res.setHeader('X-Final-Vcodec', verified.videoCodecLabel || 'Unknown');
    }
    res.setHeader('X-Final-Size', stat.size);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, X-Final-Resolution, X-Final-Fps, X-Final-Vcodec, X-Final-Size');

    const stream = createReadStream(filePath);
    stream.pipe(res);
    stream.on('close', () => { try { unlinkSync(filePath); } catch(_){} });
  } catch (err) {
    console.error('[CAROUSEL-DL ERROR]', err.message);
    if (!res.headersSent) res.status(500).json({ error: parseError(err.message) });
  }
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const proc = spawn(YT_DLP, ['--version'], { stdio: ['ignore','pipe','pipe'], windowsHide: true });
  let version = '';
  proc.stdout.on('data', d => (version += d.toString().trim()));
  proc.on('close', code => {
    if (res.headersSent) return;
    res.json({
      status: 'ok',
      backend: true,
      ytdlp: code === 0,
      ytdlpVersion: version || 'unknown',
      ytdlpPath: YT_DLP,
      ffmpeg: Boolean(ffmpegPath && existsSync(ffmpegPath)),
      ffmpegPath: ffmpegPath || null,
      ffprobe: Boolean(FFPROBE && existsSync(FFPROBE)),
      ffprobePath: FFPROBE,
      cookies: Boolean(COOKIES_PATH && existsSync(COOKIES_PATH)),
      cookiesPath: COOKIES_PATH || null,
    });
  });
  proc.on('error', error => {
    if (res.headersSent) return;
    res.json({
      status: 'ok',
      backend: true,
      ytdlp: false,
      ytdlpVersion: null,
      ytdlpPath: YT_DLP,
      ytdlpError: error.code === 'ENOENT' ? 'yt-dlp is not installed or not on PATH.' : error.message,
      ffmpeg: Boolean(ffmpegPath && existsSync(ffmpegPath)),
      ffmpegPath: ffmpegPath || null,
      ffprobe: Boolean(FFPROBE && existsSync(FFPROBE)),
      ffprobePath: FFPROBE,
      cookies: Boolean(COOKIES_PATH && existsSync(COOKIES_PATH)),
      cookiesPath: COOKIES_PATH || null,
    });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🚀  OmniStream 4K Backend  →  http://localhost:${PORT}`);
  console.log(`  📂  Temp folder: ${TEMP_DIR}`);
  console.log(`  🎬  FFmpeg: ${ffmpegPath || 'NOT FOUND'}\n`);
});
// Increase keep-alive and header timeouts to accommodate long transcode jobs
server.keepAliveTimeout = 65000;
server.headersTimeout   = 20 * 60 * 1000; // 20 minutes
server.on('error', error => {
  console.error(`[SERVER] Could not listen on port ${PORT}: ${error.message}`);
  if (error.code === 'EADDRINUSE') console.error(`[SERVER] Port ${PORT} is already in use. Stop the other process or set PORT to a free port and update vite.config.js.`);
  process.exitCode = 1;
});
