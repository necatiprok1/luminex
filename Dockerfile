FROM node:20-alpine

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# Production environment ayarla
ENV NODE_ENV=production

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install && npm cache clean --force

# Kaynak kodları kopyala
COPY . .

# Port türünü belirt
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Botu başlat
CMD ["npm", "start"]
