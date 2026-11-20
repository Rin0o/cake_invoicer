# Gera src/pdf/logotipo.ts a partir de assets/diana_cakes_logo.png.
# Correr depois de trocar o logótipo:  powershell -File scripts/gerar-logotipo.ps1
# A imagem é reduzida a 512 px e guardada como JPEG sobre fundo branco (o PDF é branco),
# para o texto em base64 ficar pequeno (~50 KB).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$origem = Join-Path $raiz 'assets\diana_cakes_logo.png'
$destino = Join-Path $raiz 'src\pdf\logotipo.ts'
$lado = 512

$img = [System.Drawing.Image]::FromFile($origem)
$bmp = New-Object System.Drawing.Bitmap $lado, $lado
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = 'HighQualityBicubic'
$g.SmoothingMode = 'HighQuality'
$g.PixelOffsetMode = 'HighQuality'
$g.DrawImage($img, 0, 0, $lado, $lado)

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 90L
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, $jpeg, $params)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()

$b64 = [Convert]::ToBase64String($ms.ToArray())
$ts = "// Gerado a partir de assets/diana_cakes_logo.png (512 px, JPEG sobre branco). Não editar à mão.`n" +
  "// Embebido no código porque, no APK de release, a imagem da app não tem um caminho de`n" +
  "// ficheiro que se possa ler em base64, e o PDF saía sem logótipo.`n" +
  "// Para atualizar: powershell -File scripts/gerar-logotipo.ps1`n" +
  "export const LOGOTIPO_DATA_URI =`n  'data:image/jpeg;base64,$b64';`n"
[IO.File]::WriteAllText($destino, $ts, (New-Object System.Text.UTF8Encoding $false))
Write-Output "Escrito $destino ($($b64.Length) caracteres)"
