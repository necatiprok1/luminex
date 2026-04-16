# Discord OAuth2 Setup Guide - Dashboard Authentication

Bu rehber, Luminex Bot Dashboard'ı Discord OAuth2 ile kimlik doğrulama yapmak için gerekli adımları açıklar.

## 🎯 Genel Bakış

Luminex Dashboard, Discord OAuth2 protokolü kullanarak kullanıcıları doğrular. Bu sayede Dashboard'a girerek Discord hesabınız ile sunucularınızı yönetebilirsiniz.

---

## 📋 Gereken Bilgiler

Bu setup'ı tamamlamak için:
- Discord Developer Portal erişimi (https://discord.com/developers)
- Bot'ı barındırdığınız server'ın adresi (localhost:3000 veya production URL)
- `.env` dosyasına erişim

---

## 🚀 Adım-Adım Kurulum

### **Adım 1: Discord Developer Portal'a Giriş Yapın**

1. https://discord.com/developers/applications adresine gidin
2. Discord hesabınız ile giriş yapın (bot owner hesabınız olmalı)

### **Adım 2: Yeni Uygulama Oluşturun (Eğer yoksa)**

1. **"New Application"** butonuna tıklayın
2. Uygulamaya bir isim verin: `Luminex Dashboard` (veya isterseniz başka bir ad)
3. **"Create"** butonuna tıklayın
4. Terms of Service ve Developer Terms'ü kabul edin

### **Adım 3: OAuth2 Redirect URI'ni Ekleyin**

1. Soldaki menüden **"OAuth2"** seçeneğine tıklayın
2. **"General"** sekmesinde aşağı kaydırın
3. **"Redirect URLs"** kısmını bulun

**Geliştirme (Development) için:**
```
http://localhost:3000/auth/callback
```

**Production için:**
```
https://your-domain.com/auth/callback
```

> ⚠️ **Önemli:** URL'nin sonunda `/auth/callback` tam olarak yazılı olmalıdır. Değilse OAuth2 çalışmayacak!

4. URL'yi yazıp **"Save Changes"** butonuna tıklayın

### **Adım 4: Client ID ve Client Secret'ı Kopyalayın**

Aynı **OAuth2 > General** sayfasında:

1. **"Client ID"** alanını bulun ve değerini kopyalayın
   - Örnek: `1173201974225801288`

2. **"Client Secret"** alanını bulun
   - Eğer görünmüyorsa **"Reset Secret"** butonuna tıklayın
   - Secret oluşturulur
   - **HEMEN KOPYALAYIN** - bir daha göremezsiniz!

> 🔒 **Güvenlik Uyarısı:** Client Secret asla paylaşmayın! Git'e commit etmeyin!

### **Adım 5: OAuth2 Scopes'ları Ayarlayın**

Aynı sayfada aşağı kaydırın - **"Scopes"** kısmını bulun:

Aşağıdaki scopes'ları seçin:
- ✅ `identify` - Kullanıcı profilini okur
- ✅ `guilds` - Kullanıcının sunucularını okur

```
Seçili Scopes: identify, guilds
```

### **Adım 6: .env Dosyasını Güncelleyin**

Proje köküne `.env` dosyasını açın (yoksa `.env.example`'ı kopyalayıp `.env` yapın):

```bash
# Dosya konumu: /Luminex/.env
```

Şu satırları bulun ve değiştivin:

```env
# Discord Client ID (Adım 4'ten kopyalayın)
DISCORD_CLIENT_ID=1173201974225801288

# Discord Client Secret (Adım 4'ten kopyalayın) 
DISCORD_CLIENT_SECRET=drNfQ09RqKZGd4liRp4-DCxgoidFCRA4

# Dashboard URL (geliştirme için)
DASHBOARD_URL=http://localhost:3000

# Production URL örneği:
# DASHBOARD_URL=https://dashboard.example.com

# Session Secret (random güvenli string)
# Oluşturmak için terminal'de çalıştırın:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your_random_32_char_secret_here
```

### **Adım 7: Bot İntentlerini Ayarlayın (Optional ama Önerilir)**

Dashboard sadece OAuth2 ile çalışsa da, bot kendisi daha yapması gereken şeyler için intents'a ihtiyaç duyabilir.

1. **Developer Portal**'da uygulamanızı açın
2. Soldaki menüden **"Bot"** seçeneğine tıklayın
3. **"Privileged Gateway Intents"** bölümünde:
   - ✅ `Server Members Intent` - Sunucu üyelerine erişim
   - ✅ `Message Content Intent` - Mesaj içeriğini oku

---

## ✅ Test Etme

Tüm ayarlar tamamlandığında, dashboard'ı test edin:

### 1. **Bot'ı Çalıştırın:**
```bash
cd /Users/necatieminkars/Documents/Luminex
docker-compose up
# veya
npm start
```

### 2. **Dashboard'a Gidin:**
```
http://localhost:3000
```

### 3. **"Discord ile Oturum Aç" Butonuna Tıklayın**

Aşağıdakiler olmalı:
1. Discord authorization sayfasına yönlendirileceksiniz
2. Permissions'ı kabul edin
3. Geri yönlendirileceksiniz
4. Sunucuların listesini göreceksiniz

> ✅ Başarılı!

---

## 🔧 Sorun Giderme

### **"OAuth2 credentials not configured" Hatası**

| Problem | Çözüm |
|---------|--------|
| `DISCORD_CLIENT_ID` boş | `.env` dosyasında değeri kontrol edin |
| `DISCORD_CLIENT_SECRET` boş | `.env` dosyasında değeri kontrol edin |
| Hardcoded credential uyarısı | `.env` dosyasına taşındığından emin olun |

### **"Invalid Redirect URI" Hatası**

| Problem | Çözüm |
|---------|--------|
| Sayfaya yönlendirilmez | Discord Portal'da **Redirect URL** tam olarak `http://localhost:3000/auth/callback` yazılı mı? |
| Production'da çalışmıyor | `DASHBOARD_URL` değişkenini `https://your-domain.com` yapın |

### **"Authorization failed" Hatası**

| Problem | Çözüm |
|---------|--------|
| Client ID hatalı | Developer Portal'dan Client ID'yi kopyalayıp tekrar yazın |
| Client Secret hatalı | Developer Portal'da **Reset Secret** yapıp yeni secret'ı kopyalayın |
| Scopes eksik | `identify` ve `guilds` seçili mi? |

### **"Cannot POST /auth/callback" Hatası**

| Problem | Çözüm |
|---------|--------|
| Endpoint hatalı | `DASHBOARD_URL` değişkeni doğru mu? |
| Server çalıştırılmamış | `docker-compose up` veya `npm start` kesin mi? |

---

## 🔐 Üretim Dağıtımı (Production)

### Production için Adımlar:

1. **Domain ve SSL Sertifikası Alın**
   - Örnek: https://dashboard.example.com
   - HTTPS sertifikası (Let's Encrypt'ten ücretsiz)

2. **Discord Portal'da Redirect URI Güncelleyin**
   ```
   https://dashboard.example.com/auth/callback
   ```
   (http değil https!)

3. **.env'yi Güncelleyin**
   ```env
   DISCORD_CLIENT_ID=your_id
   DISCORD_CLIENT_SECRET=your_secret
   DASHBOARD_URL=https://dashboard.example.com
   SESSION_SECRET=your_secure_random_string_min_32_chars
   NODE_ENV=production
   ```

4. **Environment Kontrolü**
   ```env
   NODE_ENV=production  # Bu ayarlandığında cookies secure (HTTPS only) olur
   ```

---

## 📞 Ek Kaynaklar

- Discord Developer Portal: https://discord.com/developers
- Discord OAuth2 Docs: https://discord.com/developers/docs/topics/oauth2
- Luminex GitHub: [GitHub repo]*
- Sorunuz varsa issue açın: [GitHub Issues]*

---

## ⚙️ Teknik Detaylar

### OAuth2 Flow:

```
1. Kullanıcı "Discord ile Giriş Yap" tıklar
    ↓
2. Discord Authorization Sayfasına yönlendir
    ↓
3. Kullanıcı izinleri kabul eder
    ↓
4. Discord bizi /auth/callback'e yönlendir (+ code)
    ↓
5. Biz code'u Client Secret ile token'e çeviririz
    ↓
6. Token ile user info alırız
    ↓
7. Session'da tokens kaydederiz
    ↓
8. /servers sayfasına yönlendiririz
```

### Token Expiry:

- Access Token: 7 gün
- Refresh Token: 30 gün
- Otomatik refresh: 1 saat kala otomatik yenilenir

---

**Kurulum tamamlandı! Dashboard artık Discord OAuth2 ile çalışyor!** 🎉
