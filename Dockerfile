FROM node:18-alpine

# Uygulama dizinini oluştur
WORKDIR /usr/src/app

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Kaynak kodları kopyala
COPY . .

# Botu başlat
CMD ["npm", "start"]
