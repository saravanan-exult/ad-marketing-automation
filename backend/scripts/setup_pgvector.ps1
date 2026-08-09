$pgHba = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
if (-Not (Test-Path $pgHba)) {
  Write-Error "pg_hba.conf not found at $pgHba"
  exit 1
}
Copy-Item -Path $pgHba -Destination "$pgHba.bak" -Force
(Get-Content $pgHba) | ForEach-Object {
  if ($_ -match '^\s*local\s+all\s+all\s+\S+') {
    'local   all             all                                     trust'
  } elseif ($_ -match '^\s*host\s+all\s+all\s+127\.0\.0\.1/32\s+\S+') {
    'host    all             all             127.0.0.1/32            trust'
  } elseif ($_ -match '^\s*host\s+all\s+all\s+::1/128\s+\S+') {
    'host    all             all             ::1/128                 trust'
  } else {
    $_
  }
} | Set-Content $pgHba
Write-Output "Updated pg_hba.conf to trust local connections"
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$createRole = @"
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'adtech') THEN
    CREATE ROLE adtech LOGIN PASSWORD 'securepassword123';
  END IF;
END$$;
"@
$createDb = @"
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'adtech_db') THEN
    PERFORM dblink_exec('dbname=postgres user=postgres', 'CREATE DATABASE adtech_db OWNER adtech');
  END IF;
END$$;
"@
$createDbSimple = @"
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'adtech_db') THEN
    CREATE DATABASE adtech_db OWNER adtech;
  END IF;
END$$;
"@

& $psql -U postgres -h 127.0.0.1 -c "SELECT 1;" | Write-Output
& $psql -U postgres -h 127.0.0.1 -c "$createRole" | Write-Output
& $psql -U postgres -h 127.0.0.1 -d postgres -c "$createDbSimple" | Write-Output
& $psql -U postgres -h 127.0.0.1 -d adtech_db -c "CREATE EXTENSION IF NOT EXISTS vector;" | Write-Output
& $psql -U postgres -h 127.0.0.1 -c "SELECT pg_reload_conf();" | Write-Output
Write-Output "PostgreSQL pgvector setup script completed."
