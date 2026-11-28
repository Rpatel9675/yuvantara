$root = $PSScriptRoot
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Local Yuvantara Web Server running on http://localhost:$port/"

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $rawPath = [System.Uri]::UnescapeDataString($req.Url.LocalPath.TrimStart('/'))
        if ($rawPath -eq '') {
            $rawPath = 'index.html'
        }

        # Safety redirect if an old or cached /assets/portal or /assets/admin_login_777 request arrives
        if ($rawPath -match '^assets\/(portal|admin_login_777)(.*)') {
            $res.StatusCode = 301
            $res.RedirectLocation = '/' + $matches[1] + $matches[2]
            $res.OutputStream.Close()
            continue
        }

        $file = Join-Path $root $rawPath

        # Fallback check inside assets/ directory if not found in root (e.g. style.css, portal.css, db.js, site.js)
        if (!(Test-Path $file) -and (Test-Path (Join-Path $root "assets\$rawPath"))) {
            $file = Join-Path $root "assets\$rawPath"
        }

        if (Test-Path $file -PathType Container) {
            if (!$req.Url.LocalPath.EndsWith('/')) {
                $res.StatusCode = 301
                $res.RedirectLocation = $req.Url.LocalPath + '/'
                $res.OutputStream.Close()
                continue
            }
            $file = Join-Path $file 'index.html'
        }

        if (Test-Path $file -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.css'  { 'text/css' }
                '.js'   { 'application/javascript' }
                '.json' { 'application/json' }
                '.jpg'  { 'image/jpeg' }
                '.jpeg' { 'image/jpeg' }
                '.png'  { 'image/png' }
                '.webp' { 'image/webp' }
                '.svg'  { 'image/svg+xml' }
                default { 'application/octet-stream' }
            }
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $res.ContentType = $mime
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.OutputStream.Close()
    } catch {
        # Catch connection drops
    }
}
