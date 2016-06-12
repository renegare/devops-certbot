FROM mhart/alpine-node:4

ENV NODE_ENV  production

RUN echo '@edge http://dl-cdn.alpinelinux.org/alpine/edge/main' >> /etc/apk/repositories \
    && echo '@v3.4 http://dl-cdn.alpinelinux.org/alpine/v3.4/community' >> /etc/apk/repositories \
    && apk add --update \
      py-pip@edge=8.1.2-r0 \
      certbot@v3.4=0.7.0-r0 \
    && pip install acme==0.7.0 \
    && certbot --version

COPY package.json /app/package.json
RUN cd /app \
  && npm i

COPY server.js /app/server.js
COPY VERSION /app/VERSION

WORKDIR /app

EXPOSE 3000

CMD ["npm", "start"]
