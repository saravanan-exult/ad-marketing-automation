$env:PGPASSWORD = 'securepassword123'
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
Write-Output "PSQL path: $psql"
Write-Output "Current user: $env:USERNAME"
Write-Output "Trying adtech user"
& $psql -U adtech -h 127.0.0.1 -p 5432 -c "select version();" 2>&1 | Write-Output
Write-Output "Trying postgres user"
& $psql -U postgres -h 127.0.0.1 -p 5432 -c "select version();" 2>&1 | Write-Output
