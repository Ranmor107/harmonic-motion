[CmdletBinding()]
param(
    [int]$Port = 5174,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$serverUrl = "http://127.0.0.1:$Port/"
$serverProcess = $null
$serverListenerProcessId = $null
$browserProcess = $null
$profilePath = $null
$exitCode = 0

function Test-LocalPort {
    param([int]$CheckPort)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect('127.0.0.1', $CheckPort, $null, $null)
        if ($connect.AsyncWaitHandle.WaitOne(250) -and $client.Connected) {
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Get-ListeningProcessId {
    param([int]$CheckPort)

    $match = netstat -ano | Select-String (":$CheckPort\s+.*LISTENING") | Select-Object -First 1
    if (-not $match) {
        return $null
    }

    $columns = $match.ToString().Trim() -split '\s+'
    return [int]$columns[-1]
}

function Resolve-BrowserPath {
    $commandNames = @('msedge.exe', 'chrome.exe')
    foreach ($commandName in $commandNames) {
        $command = Get-Command $commandName -ErrorAction SilentlyContinue
        if ($command -and $command.Source -and (Test-Path -LiteralPath $command.Source)) {
            return $command.Source
        }
    }

    $candidates = @(
        (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Stop-ProcessTree {
    param([System.Diagnostics.Process]$Process)

    if ($null -eq $Process) {
        return
    }

    try {
        if ($Process.HasExited) {
            return
        }
        & "$env:SystemRoot\System32\taskkill.exe" /PID $Process.Id /T /F *> $null
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
}

function Remove-TemporaryProfile {
    if ($null -eq $profilePath -or -not (Test-Path -LiteralPath $profilePath)) {
        return
    }

    for ($attempt = 0; $attempt -lt 5; $attempt++) {
        try {
            Remove-Item -LiteralPath $profilePath -Recurse -Force -ErrorAction Stop
            return
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }

    Write-Warning "Temporary browser profile could not be removed: $profilePath"
}

try {
    if ($Port -lt 1024 -or $Port -gt 65535) {
        throw "Port must be between 1024 and 65535."
    }

    if (Test-LocalPort -CheckPort $Port) {
        throw "Port $Port is already in use. Close the existing local server, then try again."
    }

    Write-Host "Starting Harmonic Motion on $serverUrl"
    $serverProcess = Start-Process -FilePath 'cmd.exe' `
        -ArgumentList @('/d', '/c', "npm run dev -- --port $Port") `
        -WorkingDirectory $repoRoot `
        -WindowStyle Hidden `
        -PassThru

    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        if ($serverProcess.HasExited) {
            throw "The Vite server exited before becoming ready."
        }

        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $serverUrl -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                $ready = $true
                break
            }
        } catch {
            # The server is still starting.
        }

        Start-Sleep -Milliseconds 250
    }

    if (-not $ready) {
        throw "The Vite server did not respond within 30 seconds."
    }

    $serverListenerProcessId = Get-ListeningProcessId -CheckPort $Port

    if ($NoBrowser) {
        Write-Host "Server ready (NoBrowser check); cleaning up."
        return
    }

    $browserPath = Resolve-BrowserPath
    if (-not $browserPath) {
        throw 'Microsoft Edge or Google Chrome was not found.'
    }

    $profilePath = Join-Path ([System.IO.Path]::GetTempPath()) ("harmonic-motion-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $profilePath | Out-Null
    $browserArguments = '--app="' + $serverUrl + '" --user-data-dir="' + $profilePath + '" --no-first-run --no-default-browser-check'

    Write-Host 'Opening the dedicated browser window. Close that window to stop the server.'
    $browserProcess = Start-Process -FilePath $browserPath -ArgumentList $browserArguments -PassThru
    $lockFile = Join-Path $profilePath 'lockfile'
    $browserReady = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        if (Test-Path -LiteralPath $lockFile) {
            $browserReady = $true
            break
        }
        if ($browserProcess.HasExited -and $attempt -gt 8) {
            break
        }
        Start-Sleep -Milliseconds 250
    }

    if (-not $browserReady) {
        throw 'The dedicated browser window did not stay open.'
    }

    while (Test-Path -LiteralPath $lockFile) {
        Start-Sleep -Milliseconds 500
    }
} catch {
    $exitCode = 1
    Write-Error $_
} finally {
    Stop-ProcessTree -Process $browserProcess
    if ($serverListenerProcessId) {
        Stop-Process -Id $serverListenerProcessId -Force -ErrorAction SilentlyContinue
    }
    Stop-ProcessTree -Process $serverProcess
    Remove-TemporaryProfile
}

exit $exitCode
