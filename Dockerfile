FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

ARG JELLYFIN_URL
ARG APP_LANGUAGE

ENV JELLYFIN_URL=$JELLYFIN_URL
ENV APP_LANGUAGE=$APP_LANGUAGE

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

#CMD ["/bin/sh", "-c", "sed -i \"s|__JELLYFIN_URL__|$JELLYFIN_URL|g\" /usr/share/nginx/html/index.html && nginx -g 'daemon off;'"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
