# Đồng bộ mã nguồn từ máy Windows lên VPS qua SSH — KHÔNG dùng git clone / GitHub.
#
# Yêu cầu: OpenSSH Client (ssh, scp) trên Windows; VPS đã có thư mục đích (hoặc tự tạo).
#
# Ví dụ:
#   .\deploy\sync-to-vps.ps1 -VpsHost 203.0.113.10 -VpsUser ubuntu
#   .\deploy\sync-to-vps.ps1 -VpsHost 203.0.113.10 -SshPort 22 -RemoteDir /home/ubuntu/code-judge

param(
    [Parameter(Mandatory = $true)]
    [string] $VpsHost,

    [string] $VpsUser = "ubuntu",
    [int] $SshPort = 22,
    [string] $RemoteDir = "/home/ubuntu/code-judge"
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ArchiveName = "code-judge-sync.tar.gz"
$ArchivePath = Join-Path $env:TEMP $ArchiveName
$RemoteArchive = "/tmp/$ArchiveName"

if (Test-Path $ArchivePath) {
    Remove-Item -Force $ArchivePath
}

Write-Host "==> Đóng gói repo (bỏ node_modules, .next, .env) ..."
Push-Location $RepoRoot
try {
    & tar -czf $ArchivePath `
        --exclude=.git `
        --exclude=.github `
        --exclude=node_modules `
        --exclude=apps/web/.next `
        --exclude=apps/core-api/dist `
        --exclude=apps/worker/dist `
        --exclude=.env `
        --exclude=.env.production `
        --exclude=apps/core-api/.env `
        --exclude=apps/worker/.env `
        --exclude=apps/web/.env `
        .
    if ($LASTEXITCODE -ne 0) { throw "tar failed with exit $LASTEXITCODE" }
}
finally {
    Pop-Location
}

$sshTarget = "${VpsUser}@${VpsHost}"
$scpArgs = @("-P", "$SshPort", $ArchivePath, "${sshTarget}:${RemoteArchive}")
$sshBase = @("-p", "$SshPort", $sshTarget)

Write-Host "==> Upload lên VPS ($sshTarget) ..."
& scp @scpArgs
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Host "==> Giải nén trên VPS → $RemoteDir ..."
# LF-only, no [String]::Format — tránh lỗi bash: "/path: Is a directory"
$rd = $RemoteDir -replace "'", "'\\''"
$ra = $RemoteArchive -replace "'", "'\\''"
$remoteLines = @(
    "set -euo pipefail"
    "mkdir -p '$rd'"
    "tar -xzf '$ra' -C '$rd'"
    "rm -f '$ra'"
    "if [ -d '$rd/deploy' ]; then find '$rd/deploy' -maxdepth 1 -type f -name '*.sh' -exec sed -i 's/\r`$//' {} + || true; chmod +x '$rd/deploy'/*.sh 2>/dev/null || true; fi"
    "if [ -d '$rd/scripts' ]; then find '$rd/scripts' -maxdepth 1 -type f -name '*.sh' -exec sed -i 's/\r`$//' {} + || true; fi"
    "chmod +x '$rd/deploy'/*.sh 2>/dev/null || true"
    "chmod +x '$rd/scripts'/*.sh 2>/dev/null || true"
    "echo 'Sync done -> $rd'"
)
# Một lệnh bash duy nhất, kết thúc LF (OpenSSH trên Windows)
$remoteCmd = ($remoteLines -join "`n") + "`n"

& ssh @sshBase $remoteCmd
if ($LASTEXITCODE -ne 0) { throw "ssh extract failed" }

Remove-Item -Force $ArchivePath

Write-Host ""
Write-Host "Tiếp theo trên VPS:"
Write-Host "  ssh $sshTarget"
Write-Host "  cd $RemoteDir"
Write-Host "  cp .env.production.example .env.production   # chỉnh secret + URL"
Write-Host "  chmod 600 .env.production"
Write-Host "  ./deploy/production-up.sh"
