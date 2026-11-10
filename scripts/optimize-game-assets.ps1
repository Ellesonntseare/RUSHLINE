$ErrorActionPreference='Stop'
Set-Location $PSScriptRoot/..
New-Item -ItemType Directory -Force .asset-work | Out-Null
python scripts/extract-fbx-textures.py
Add-Type -AssemblyName System.Drawing
Get-ChildItem .asset-work -Filter '*.png' | Where-Object {$_.Name -notlike '*.small.png'} | ForEach-Object {
 $source=[System.Drawing.Image]::FromFile($_.FullName)
 $ratio=[math]::Min(1.0,1024.0/[math]::Max($source.Width,$source.Height))
 $scaled=[System.Drawing.Bitmap]::new([int]($source.Width*$ratio),[int]($source.Height*$ratio))
 $graphics=[System.Drawing.Graphics]::FromImage($scaled)
 $graphics.InterpolationMode='HighQualityBicubic'
 $graphics.DrawImage($source,0,0,$scaled.Width,$scaled.Height)
 $scaled.Save(($_.FullName+'.small.png'),[System.Drawing.Imaging.ImageFormat]::Png)
 $graphics.Dispose();$scaled.Dispose();$source.Dispose()
}
python scripts/optimize-fbx-textures.py
node scripts/extract-gameplay-clips.mjs
npx gltf-transform optimize public/assets/user-train/bombardier_s_train_carriage_-_london_underground.glb public/assets/optimized/train-meshopt.glb --compress meshopt --simplify false --weld false --texture-compress false --instance false --palette false
