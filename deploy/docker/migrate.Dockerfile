# Applies db/migrations that the database does not have yet (same rules as scripts/mac/migrate.sh).
# Runs as an init container before the API starts, so every release migrates first.
FROM postgres:18-alpine
# only psql / pg_isready are used here: drop the server entrypoint helper (gosu, old Go stdlib = scanner CRITICALs)
RUN rm -f /usr/local/bin/gosu /usr/local/bin/docker-entrypoint.sh && apk upgrade --no-cache
COPY db/migrations /migrations
COPY deploy/docker/migrate.sh /migrate.sh
USER postgres
ENTRYPOINT ["sh", "/migrate.sh"]
