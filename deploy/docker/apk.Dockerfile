# The student app's Android files, served at /download/ on the residency address (no app store, no GitHub sign-in).
# Built by .github/workflows/mobile-apk.yml from the APKs it has just made:
#   /download/KL-Residencies.apk       -> https://residency.klfacultyhiring.com (real data)
#   /download/KL-Residencies-demo.apk  -> https://demo-residency.klfacultyhiring.com (training data)
#   /download/KL-Dashboard.apk         -> the leadership dashboard app
FROM nginxinc/nginx-unprivileged:1.29-alpine
USER root
RUN apk upgrade --no-cache
USER 101
COPY deploy/docker/apk-nginx.conf /etc/nginx/conf.d/default.conf
COPY apk/KL-Residencies-live.apk /usr/share/nginx/html/download/KL-Residencies.apk
COPY apk/KL-Residencies-demo.apk /usr/share/nginx/html/download/KL-Residencies-demo.apk
COPY apk/KL-Dashboard.apk /usr/share/nginx/html/download/KL-Dashboard.apk
EXPOSE 8080
