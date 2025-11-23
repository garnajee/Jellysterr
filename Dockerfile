FROM node:20-alpine as build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .

ARG VITE_JELLYFIN_URL
ARG VITE_APP_LANGUAGE

ENV VITE_JELLYFIN_URL=$VITE_JELLYFIN_URL
ENV VITE_APP_LANGUAGE=$VITE_APP_LANGUAGE

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
