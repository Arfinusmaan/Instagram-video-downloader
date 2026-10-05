import {
  getResolutionTier, formatVideoCodec, formatAudioCodec, buildQualityTiers,
  makeVideoFilename, isIOSPlayable,
} from './server.js';

let passed = 0;
let total = 0;

function assert(name, condition, details) {
  total++;
  if (condition) {
    passed++;
    console.log('  ✔ PASS:', name);
  } else {
    console.error('  ❌ FAIL:', name, details);
  }
}

console.log('\n==================================================');
console.log('   OMNISTREAM SECTION 25 ACCEPTANCE TEST SUITE    ');
console.log('==================================================\n');

// TEST A: Instagram portrait 1080x1920
const tA = getResolutionTier(1080, 1920);
assert('TEST A: 1080x1920 is 1080p (NOT 2K)', tA && tA.id === '1080p', tA);

// TEST B: Instagram portrait 720x1280
const tB = getResolutionTier(720, 1280);
assert('TEST B: 720x1280 is 720p', tB && tB.id === '720p', tB);

// TEST C: Landscape 1920x1080
const tC = getResolutionTier(1920, 1080);
assert('TEST C: Landscape 1920x1080 is 1080p', tC && tC.id === '1080p', tC);

// TEST D: Landscape 2560x1440
const tD = getResolutionTier(2560, 1440);
assert('TEST D: Landscape 2560x1440 is 2K', tD && tD.id === '2k', tD);

// TEST E: Landscape 3840x2160
const tE = getResolutionTier(3840, 2160);
assert('TEST E: Landscape 3840x2160 is 4K', tE && tE.id === '4k', tE);

// TEST F: Portrait 1440x2560
const tF = getResolutionTier(1440, 2560);
assert('TEST F: Portrait 1440x2560 is 2K', tF && tF.id === '2k', tF);

// TEST G: Portrait 2160x3840
const tG = getResolutionTier(2160, 3840);
assert('TEST G: Portrait 2160x3840 is 4K', tG && tG.id === '4k', tG);

// TEST H: Source with only 1080p
const formatsH = [
  { format_id: '1', width: 1080, height: 1920, vcodec: 'avc1', acodec: 'mp4a', fps: 30 }
];
const tiersH = buildQualityTiers(formatsH, 10);
const videoTiersH = tiersH.filter(t => t.id !== 'audio-320');
assert('TEST H: Source with only 1080p displays only 1080p', videoTiersH.length === 1 && videoTiersH[0].id === '1080p', videoTiersH);

// TEST I: Source with 4K + 2K + 1080p
const formatsI = [
  { format_id: '4k', width: 3840, height: 2160, vcodec: 'vp9', acodec: 'none', fps: 60 },
  { format_id: '2k', width: 2560, height: 1440, vcodec: 'vp9', acodec: 'none', fps: 60 },
  { format_id: 'fhd', width: 1920, height: 1080, vcodec: 'avc1', acodec: 'none', fps: 60 },
  { format_id: 'a', acodec: 'opus', abr: 160 }
];
const tiersI = buildQualityTiers(formatsI, 60);
const tierIdsI = tiersI.map(t => t.id);
assert('TEST I: Source with 4K+2K+1080p displays all three', tierIdsI.includes('4k') && tierIdsI.includes('2k') && tierIdsI.includes('1080p'), tierIdsI);

// TEST J: Source with separate video/audio streams has correct IDs for FFmpeg
const fhdTier = tiersI.find(t => t.id === '1080p');
assert('TEST J: Separate video+audio formats paired for FFmpeg merge', fhdTier.videoFormatId === 'fhd' && fhdTier.audioFormatId === 'a', fhdTier);

// TEST K: Source where filesize is unavailable
const formatsK = [
  { format_id: '1', width: 1920, height: 1080, vcodec: 'avc1', acodec: 'mp4a', fps: 30 }
];
const tiersK = buildQualityTiers(formatsK, 0);
assert('TEST K: No fake filesize when unavailable', tiersK[0].estimatedSize === 'Size: Unknown', tiersK[0].estimatedSize);

// TEST L: Source with 30 FPS displays 30 FPS, not 60 FPS
assert('TEST L: 30 FPS stream displays 30 FPS', tiersK[0].fps === '30 FPS', tiersK[0].fps);

// TEST M: AV1 identification
assert('TEST M: AV1 recognized', formatVideoCodec('av01.0.12M.10.0.110.09.16.09.0') === 'AV1');

// TEST N: VP9 identification
assert('TEST N: VP9 recognized', formatVideoCodec('vp09.00.40.08') === 'VP9');

// TEST O: H.264 identification
assert('TEST O: H.264 recognized', formatVideoCodec('avc1.640028') === 'H.264');
assert('TEST O2: AAC recognized', formatAudioCodec('mp4a.40.2') === 'AAC');

// TEST P: Prefer an H.264/AAC source at matching dimensions without transcoding
const mobileFormats = [
  { format_id: 'vp9', width: 1920, height: 1080, vcodec: 'vp09.00.40.08', acodec: 'none', ext: 'mp4', fps: 30 },
  { format_id: 'h264', width: 1920, height: 1080, vcodec: 'avc1.640028', acodec: 'none', ext: 'mp4', fps: 30 },
  { format_id: 'aac', acodec: 'mp4a.40.2', ext: 'm4a', abr: 128 },
];
const mobileTier = buildQualityTiers(mobileFormats, 15).find(t => t.id === '1080p');
assert('TEST P: H.264/AAC source is preferred for iPhone', mobileTier?.iosCompatibleSource?.videoFormatId === 'h264' && mobileTier?.iosCompatibleSource?.audioFormatId === 'aac', mobileTier?.iosCompatibleSource);

// TEST Q: Do not label VP9/Opus as iPhone-compatible source
const incompatibleTier = buildQualityTiers([
  { format_id: 'vp9', width: 1920, height: 1080, vcodec: 'vp09.00.40.08', acodec: 'none', ext: 'webm', fps: 30 },
  { format_id: 'opus', acodec: 'opus', ext: 'webm', abr: 160 },
], 15).find(t => t.id === '1080p');
assert('TEST Q: VP9/Opus is not marked as compatible source', incompatibleTier?.iosCompatibleSource === null && incompatibleTier?.sourceCompatibility === 'limited', incompatibleTier?.iosCompatibleSource);

// TEST R: Caption is used as the Instagram filename and invalid path characters are removed
const captionName = makeVideoFilename({ description: 'Rainy huayra 😍 | Pagani/Huayra: wow?' }, 'https://www.instagram.com/reel/example/');
assert('TEST R: Instagram filename comes from caption and is path-safe', captionName.includes('Rainy huayra') && captionName.includes('Pagani Huayra') && !/[\\/:*?"<>|]/.test(captionName), captionName);

// TEST S: Missing Instagram caption falls back to a stable name
assert('TEST S: Missing Instagram caption falls back to Instagram_Reel.mp4', makeVideoFilename({}, 'https://www.instagram.com/reel/example/') === 'Instagram_Reel.mp4');
assert('TEST S2: Windows reserved filenames are made safe', makeVideoFilename({ title: 'CON' }, 'https://www.youtube.com/watch?v=x') === '_CON.mp4');

// TEST T: Compatibility verdict requires a broadly playable MP4/H.264/AAC/YUV420P result
const compatibleProbe = { format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2' }, streams: [
  { codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p', profile: 'High', color_transfer: 'bt709', color_primaries: 'bt709' },
  { codec_type: 'audio', codec_name: 'aac' },
] };
assert('TEST T: H.264/AAC/YUV420P SDR MP4 is iPhone playable', isIOSPlayable(compatibleProbe));
assert('TEST U: VP9 is not iPhone playable under the conservative check', !isIOSPlayable({ ...compatibleProbe, streams: [{ ...compatibleProbe.streams[0], codec_name: 'vp9' }, compatibleProbe.streams[1]] }));

console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED.`);
process.exit(passed === total ? 0 : 1);
