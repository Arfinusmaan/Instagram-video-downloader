param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [Parameter(Mandatory = $true)]
  [string]$FrontendOrigin,
  [string]$Region = 'asia-south1',
  [string]$Service = 'omnistream-api'
)

$ErrorActionPreference = 'Stop'
$Repository = 'omnistream'
$Image = "${Region}-docker.pkg.dev/{0}/{1}/{2}:latest" -f $ProjectId, $Repository, $Service

gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) { throw 'Could not select the Google Cloud project.' }

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
if ($LASTEXITCODE -ne 0) { throw 'Could not enable Cloud Run build services. Check billing and project permissions.' }

gcloud artifacts repositories describe $Repository --location $Region *> $null
if ($LASTEXITCODE -ne 0) {
  gcloud artifacts repositories create $Repository --repository-format docker --location $Region --description 'OmniStream backend images'
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the Artifact Registry repository.' }
}

gcloud builds submit --tag $Image .
if ($LASTEXITCODE -ne 0) { throw 'Container build failed.' }

# One instance keeps the app's in-memory download-job registry and prepared
# files together. One request at a time avoids overlapping heavy media work.
gcloud beta run deploy $Service `
  --image $Image `
  --region $Region `
  --execution-environment gen2 `
  --allow-unauthenticated `
  --cpu 2 `
  --memory 4Gi `
  --concurrency 1 `
  --max 1 `
  --timeout 3600 `
  --no-cpu-throttling `
  --add-volume=name=download-tmp,type=ephemeral-disk,size=5Gi `
  --add-volume-mount=volume=download-tmp,mount-path=/mnt/omnistream `
  --set-env-vars="PORT=8080,DOWNLOAD_TEMP_DIR=/mnt/omnistream,ALLOWED_ORIGINS=$FrontendOrigin"
if ($LASTEXITCODE -ne 0) { throw 'Cloud Run deploy failed.' }

gcloud run services describe $Service --region $Region --format 'value(status.url)'
