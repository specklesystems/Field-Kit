$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Projects = Join-Path $Root "projects"
New-Item -ItemType Directory -Force -Path $Projects | Out-Null

function Normalize-RepositoryUrl([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) { return "" }
  return ($Url.TrimEnd("/") -replace "\.git$", "")
}

function Add-RepositoryIfMissing(
  [string]$Name,
  [string]$Url,
  [string]$Directory
) {
  $Target = Join-Path $Projects $Directory

  if (Test-Path -LiteralPath $Target) {
    $Item = Get-Item -Force -LiteralPath $Target
    if ($null -ne $Item.LinkType) {
      throw "${Target} is a symbolic link; nothing was changed."
    }
    $GitDirectory = Join-Path $Target ".git"
    if (-not (Test-Path -LiteralPath $GitDirectory -PathType Container)) {
      throw "${Target} exists but is not a standalone Git checkout; nothing was changed."
    }
    $Actual = (& git -C $Target remote get-url origin 2>$null)
    if ($LASTEXITCODE -ne 0 -or
        (Normalize-RepositoryUrl $Actual) -ne (Normalize-RepositoryUrl $Url)) {
      if ([string]::IsNullOrWhiteSpace($Actual)) { $Actual = "none" }
      throw "${Target} has a different or missing origin: ${Actual}; nothing was changed."
    }
    Write-Host "OK: ${Name} is already present. It was not pulled or modified."
    return
  }

  Write-Host "CLONE: ${Name} -> projects/${Directory}"
  & git clone --origin origin $Url $Target
  if ($LASTEXITCODE -ne 0) { throw "Git could not clone ${Name}." }
}

Add-RepositoryIfMissing "Bundle specification" "https://github.com/specklesystems/speckle-bundle-spec.git" "speckle-bundle-spec"
Add-RepositoryIfMissing "Python SDK" "https://github.com/specklesystems/specklepy.git" "specklepy"
Add-RepositoryIfMissing "Speckle documentation" "https://github.com/specklesystems/speckle-docs-NEW.git" "speckle-docs-NEW"
Add-RepositoryIfMissing "Python Automate starter" "https://github.com/specklesystems/speckle_automate_python_example.git" "speckle_automate_python_example"

Write-Host "FieldKit foundations are ready. Open this folder in your coding agent: ${Root}"
