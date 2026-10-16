# Applies db/migrations that the database does not have yet (same rules as scripts/mac/migrate.sh).
# Runs as an init container before the API starts, so every release migrates first.
FROM postgres:18-alpine
COPY db/migrations /migrations
COPY deploy/docker/migrate.sh /migrate.sh
USER postgres
ENTRYPOINT ["sh", "/migrate.sh"]
