$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force '.asset-work', 'public/assets/optimized' | Out-Null

$assets = @(
  @{ Source = 'public/assets/city-real/facade.gltf'; Name = 'facade-hd' },
  @{ Source = 'public/assets/user-coin/video_game_coin.glb'; Name = 'coin-hd' },
  @{ Source = 'public/assets/user-mystery/mystery_block.glb'; Name = 'mystery-hd' }
)

foreach ($asset in $assets) {
  $intermediate = ".asset-work/$($asset.Name)-webp.glb"
  $output = "public/assets/optimized/$($asset.Name).glb"
  & npx gltf-transform webp $asset.Source $intermediate --quality 95
  if ($LASTEXITCODE -ne 0) { throw "Texture compression failed for $($asset.Source)" }
  & npx gltf-transform meshopt $intermediate $output --quantize-position 16 --quantize-normal 12 --quantize-texcoord 14
  if ($LASTEXITCODE -ne 0) { throw "Geometry compression failed for $($asset.Source)" }
}
