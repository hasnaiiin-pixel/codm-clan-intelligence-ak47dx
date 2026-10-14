# Da eseguire dalla radice SOLO dopo aver applicato la patch FIX25.
# Rimuove README di vecchie versioni e file BUILD_OK obsoleti; NON tocca documenti tecnici né dati.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$history = Join-Path $root 'docs\project_history\RELEASE_NOTES_LEGACY.md'
if (-not (Test-Path $history)) { Write-Error 'Archivio storico FIX25 mancante: operazione annullata.'; exit 1 }
Get-ChildItem -LiteralPath $root -File | Where-Object { $_.Name -match '^README_V.+\.md$|^BUILD_OK_.+\.txt$|^BUILD_V14_TEST_STATUS\.txt$' } | ForEach-Object {
 Write-Host ('Rimozione documento storico duplicato: ' + $_.Name)
 Remove-Item -LiteralPath $_.FullName -Force
}
Write-Host 'Pulizia completata. README.md, README_INSTALLAZIONE.md e storico consolidato conservati.'
