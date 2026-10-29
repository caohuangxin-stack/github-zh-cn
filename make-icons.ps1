$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function New-GhzhIcon {
    param([int]$Size, [string]$OutPath)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 31, 35, 40))
    $radius = [Math]::Max(2, [int]($Size * 0.22))
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $textRect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($bg, $path)

    $fontSize = [Math]::Max(8, [float]($Size * 0.60))
    $font = New-Object System.Drawing.Font("Microsoft YaHei", $fontSize, [System.Drawing.FontStyle]::Bold)
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString([string][char]0x4E2D, $font, [System.Drawing.Brushes]::White, $textRect, $fmt)

    $g.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$iconsDir = Join-Path $PSScriptRoot "icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null
New-GhzhIcon -Size 16  -OutPath (Join-Path $iconsDir "icon16.png")
New-GhzhIcon -Size 48  -OutPath (Join-Path $iconsDir "icon48.png")
New-GhzhIcon -Size 128 -OutPath (Join-Path $iconsDir "icon128.png")
Write-Output "icons generated"
