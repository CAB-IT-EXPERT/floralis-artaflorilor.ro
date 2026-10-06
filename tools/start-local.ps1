param([ValidateSet('Serve','Seed','Migrate','Admin')][string]$Action='Serve')
$ErrorActionPreference='Stop'
$floralisRoot=Split-Path $PSScriptRoot
Set-Location -LiteralPath $floralisRoot
$floralisPhp=(Get-Command php -ErrorAction Stop).Source
$floralisLoaded=& $floralisPhp -m
$floralisExt=Join-Path (Split-Path $floralisPhp) 'ext'
$floralisArgs=@('-d',"extension_dir=$floralisExt")
foreach($extension in @('pdo_sqlite','pdo_mysql','gd','mbstring','curl','openssl')){
 if(($floralisLoaded -notcontains $extension) -and (Test-Path -LiteralPath (Join-Path $floralisExt "php_$extension.dll"))){$floralisArgs+=@('-d',"extension=$extension")}
}
switch($Action){
 'Seed'{$floralisArgs+='tools/seed.php'}
 'Migrate'{$floralisArgs+='tools/migrate.php'}
 'Admin'{$floralisArgs+='tools/admin.php'}
 'Serve'{$floralisArgs+=@('-S','127.0.0.1:5173','router.php')}
}
& $floralisPhp @floralisArgs
exit $LASTEXITCODE
