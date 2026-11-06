Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\thomas\.gemini\antigravity\brain\28de2434-19c2-48b7-a5e9-26e144d2dc07\.user_uploaded\media_1793991303619_7229d73e.png"
$destDir = "c:\Users\thomas\OneDrive\Documentos\Projetos\ObraHub\public"

$srcBmp = New-Object System.Drawing.Bitmap($srcPath)
Write-Host "Source image size: $($srcBmp.Width) x $($srcBmp.Height)"

# Convert black background to transparent alpha channel:
# Every pixel: alpha = brightness (or luminance), RGB = 255,255,255 (solid white with alpha mask)
function Convert-ToAlphaMask($bmp) {
    $w = $bmp.Width
    $h = $bmp.Height
    $outBmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            # Calculate luminance / brightness
            $lum = [int](0.299 * $pixel.R + 0.587 * $pixel.G + 0.114 * $pixel.B)
            
            # Smooth thresholding for clean anti-aliasing
            # If lum < 30 -> 0 alpha
            # If lum > 200 -> 255 alpha
            # In between -> linear interpolation
            if ($lum -le 25) {
                $alpha = 0
            } elseif ($lum -ge 180) {
                $alpha = 255
            } else {
                $alpha = [int](($lum - 25) / (180 - 25) * 255)
            }

            if ($alpha -gt 0) {
                $newColor = [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255)
            } else {
                $newColor = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
            }
            $outBmp.SetPixel($x, $y, $newColor)
        }
    }
    return $outBmp
}

$alphaMask = Convert-ToAlphaMask $srcBmp
$srcBmp.Dispose()

function Resize-Bitmap($source, $width, $height, $targetPath) {
    $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.DrawImage($source, 0, 0, $width, $height)
    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Generated $targetPath ($width x $height)"
}

# Standard Android notification badge sizes: 96x96 (xxhdpi) and 192x192 (xxxhdpi)
Resize-Bitmap $alphaMask 96 96 (Join-Path $destDir "badge.png")
Resize-Bitmap $alphaMask 192 192 (Join-Path $destDir "badge-192.png")

$alphaMask.Dispose()
Write-Host "Badges created successfully!"
