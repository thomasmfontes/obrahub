Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\thomas\.gemini\antigravity\brain\28de2434-19c2-48b7-a5e9-26e144d2dc07\.user_uploaded\media_1793989510906_79b7ad02.jpg"
$destDir = "c:\Users\thomas\OneDrive\Documentos\Projetos\ObraHub\public"

Copy-Item $srcPath (Join-Path $destDir "logo.jpg") -Force

$img = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($source, $width, $height, $targetPath) {
    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($source, 0, 0, $width, $height)
    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}

Resize-Image $img 512 512 (Join-Path $destDir "icon-512.png")
Resize-Image $img 512 512 (Join-Path $destDir "icon.png")
Resize-Image $img 192 192 (Join-Path $destDir "icon-192.png")
Resize-Image $img 180 180 (Join-Path $destDir "apple-touch-icon.png")
Resize-Image $img 64 64 (Join-Path $destDir "favicon.png")
Resize-Image $img 32 32 (Join-Path $destDir "favicon-32.png")

$img.Dispose()

# Also create an SVG version that embeds the base64 PNG for 100% crisp vector display
$bytes = [System.IO.File]::ReadAllBytes((Join-Path $destDir "icon-512.png"))
$base64 = [Convert]::ToBase64String($bytes)
$svgContent = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="rounded">
      <rect width="512" height="512" rx="112" ry="112" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,$base64" width="512" height="512" clip-path="url(#rounded)" />
</svg>
"@
[System.IO.File]::WriteAllText((Join-Path $destDir "icon.svg"), $svgContent)

Write-Host "Icons and SVG created successfully!"
