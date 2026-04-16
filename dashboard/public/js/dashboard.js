/**
 * Dashboard Client-Side JavaScript
 * Handles tab switching, API calls, and form submissions
 */

const guildId = window.location.pathname.split('/')[2]; // Extract from /server/:id

// ========== TAB SWITCHING ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const tabId = this.dataset.tab;
        
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        this.classList.add('active');
        document.getElementById(tabId + '-tab').classList.add('active');
        
        // Load tab-specific data
        if (tabId === 'voice') loadVoiceChannels();
        else if (tabId === 'moderation') loadModerationLogs();
        else if (tabId === 'commands') loadCommands();
        else if (tabId === 'profiles') loadLeaderboard();
    });
});

// ========== VOICE CHANNELS API ==========
async function loadVoiceChannels() {
    try {
        const response = await fetch(`/api/server/${guildId}/voice-channels`);
        const data = await response.json();
        
        if (data.success) {
            const list = document.getElementById('voice-channels-list');
            list.innerHTML = '';
            
            if (data.data.length === 0) {
                list.innerHTML = '<div class="loading-text">Ses kanalı bulunamadı</div>';
                return;
            }
            
            data.data.forEach(channel => {
                const card = document.createElement('div');
                card.className = 'mod-action-card';
                card.innerHTML = `
                    <h3>🔊 ${channel.name}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin: 8px 0;">
                        Bitrate: ${channel.bitrate} Hz | Kullanıcılar: ${channel.members}
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="edit-name-${channel.id}" placeholder="Yeni Adı" class="input-field" style="flex: 1;">
                        <button class="btn-save" onclick="updateVoiceChannel('${channel.id}')" style="flex: 0.5;">Düzenle</button>
                        <button class="btn-save" style="background: #ff4757; flex: 0.5;" onclick="deleteVoiceChannel('${channel.id}')">Sil</button>
                    </div>
                `;
                list.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Voice channels load error:', error);
        showNotification('Ses kanalları yüklenirken hata oluştu', 'error');
    }
}

async function updateVoiceChannel(channelId) {
    const name = document.getElementById(`edit-name-${channelId}`).value;
    if (!name.trim()) {
        showNotification('Lütfen kanal adını girin', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/server/${guildId}/voice-channels/${channelId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadVoiceChannels();
        }
    } catch (error) {
        showNotification('Kanal güncellenirken hata oluştu', 'error');
    }
}

async function deleteVoiceChannel(channelId) {
    if (!confirm('Bu kanalı silmek istediğinize emin misiniz?')) return;
    
    try {
        const response = await fetch(`/api/server/${guildId}/voice-channels/${channelId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadVoiceChannels();
        }
    } catch (error) {
        showNotification('Kanal silinirken hata oluştu', 'error');
    }
}

// Create voice channel button
document.getElementById('btn-create-voice')?.addEventListener('click', async function() {
    const name = prompt('Yeni ses kanalının adını girin:');
    if (!name || !name.trim()) return;
    
    try {
        const response = await fetch(`/api/server/${guildId}/voice-channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadVoiceChannels();
        }
    } catch (error) {
        showNotification('Kanal oluşturulurken hata oluştu', 'error');
    }
});

// ========== MODERATION API ==========
async function loadModerationLogs() {
    try {
        const response = await fetch(`/api/server/${guildId}/mod/logs?limit=20`);
        const data = await response.json();
        
        if (data.success) {
            const list = document.getElementById('mod-logs');
            list.innerHTML = '';
            
            if (data.data.length === 0) {
                list.innerHTML = '<div class="loading-text">Moderasyon kaydı bulunamadı</div>';
                return;
            }
            
            data.data.forEach(log => {
                const item = document.createElement('div');
                item.className = 'log-item';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="badge" style="background: var(--warning-color);">${log.action}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${new Date(log.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                    <p style="margin: 5px 0;">Kullanıcı: <strong>${log.userId}</strong></p>
                    <p style="margin: 5px 0;">Sebep: <strong>${log.reason || 'Belirtilmedi'}</strong></p>
                `;
                list.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Moderation logs load error:', error);
    }
}

// Ban button
document.getElementById('btn-ban')?.addEventListener('click', async function() {
    const userId = document.getElementById('ban-user-id').value;
    const reason = document.getElementById('ban-reason').value;
    
    if (!userId.trim()) {
        showNotification('Lütfen kullanıcı ID\'sini girin', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/server/${guildId}/mod/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('ban-user-id').value = '';
            document.getElementById('ban-reason').value = '';
            loadModerationLogs();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Yasaklama işlemi başarısız', 'error');
    }
});

// Kick button
document.getElementById('btn-kick')?.addEventListener('click', async function() {
    const userId = document.getElementById('kick-user-id').value;
    const reason = document.getElementById('kick-reason').value;
    
    if (!userId.trim()) {
        showNotification('Lütfen kullanıcı ID\'sini girin', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/server/${guildId}/mod/kick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('kick-user-id').value = '';
            document.getElementById('kick-reason').value = '';
            loadModerationLogs();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Çıkarma işlemi başarısız', 'error');
    }
});

// Warn button
document.getElementById('btn-warn')?.addEventListener('click', async function() {
    const userId = document.getElementById('warn-user-id').value;
    const reason = document.getElementById('warn-reason').value;
    
    if (!userId.trim()) {
        showNotification('Lütfen kullanıcı ID\'sini girin', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/server/${guildId}/mod/warn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('warn-user-id').value = '';
            document.getElementById('warn-reason').value = '';
            loadModerationLogs();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Uyarı işlemi başarısız', 'error');
    }
});

// Clear messages button
document.getElementById('btn-clear')?.addEventListener('click', async function() {
    const channelId = document.getElementById('clear-channel-id').value;
    const count = document.getElementById('clear-count').value;
    
    if (!channelId) {
        showNotification('Lütfen kanal seçin', 'warning');
        return;
    }
    if (!count || count < 1 || count > 100) {
        showNotification('Lütfen 1-100 arasında bir sayı girin', 'warning');
        return;
    }
    
    if (!confirm(`${count} mesajı silmek istediğinize emin misiniz?`)) return;
    
    try {
        const response = await fetch(`/api/server/${guildId}/mod/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId, count: parseInt(count) })
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('clear-channel-id').value = '';
            document.getElementById('clear-count').value = '';
            loadModerationLogs();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Mesajlar silinirken hata oluştu', 'error');
    }
});

// ========== COMMANDS API ==========
async function loadCommands() {
    try {
        const response = await fetch(`/api/server/${guildId}/commands?limit=50`);
        const data = await response.json();
        
        if (data.success) {
            const list = document.getElementById('commands-list');
            list.innerHTML = '';
            
            if (data.data.length === 0) {
                list.innerHTML = '<div class="loading-text">Henüz komut oluşturulmadı</div>';
                return;
            }
            
            data.data.forEach(cmd => {
                const card = document.createElement('div');
                card.className = 'mod-action-card';
                card.innerHTML = `
                    <h3>⚙️ ${cmd.prefix}${cmd.name}</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin: 8px 0;">${cmd.description || 'Açıklama yok'}</p>
                    <p style="font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin: 8px 0; max-height: 60px; overflow: hidden;">"${cmd.response}"</p>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-save" style="flex: 1;" onclick="deleteCommand('${cmd._id}')">Sil</button>
                    </div>
                `;
                list.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Commands load error:', error);
    }
}

// Create command button
document.getElementById('btn-create-cmd')?.addEventListener('click', async function() {
    const name = document.getElementById('cmd-name').value;
    const response = document.getElementById('cmd-response').value;
    const description = document.getElementById('cmd-description').value;
    const prefix = document.getElementById('cmd-prefix').value || '!';
    
    if (!name.trim() || !response.trim()) {
        showNotification('Lütfen komut adı ve cevapını girin', 'warning');
        return;
    }
    
    try {
        const res = await fetch(`/api/server/${guildId}/commands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim(), response: response.trim(), description, prefix })
        });
        const data = await res.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('cmd-name').value = '';
            document.getElementById('cmd-response').value = '';
            document.getElementById('cmd-description').value = '';
            document.getElementById('cmd-prefix').value = '!';
            loadCommands();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Komut oluşturulurken hata oluştu', 'error');
    }
});

async function deleteCommand(commandId) {
    if (!confirm('Bu komutu silmek istediğinize emin misiniz?')) return;
    
    try {
        const response = await fetch(`/api/server/${guildId}/commands/${commandId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            loadCommands();
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Komut silinirken hata oluştu', 'error');
    }
}

// ========== USER PROFILES & LEADERBOARD ==========
async function loadLeaderboard() {
    try {
        const response = await fetch(`/api/server/${guildId}/leaderboard?limit=20`);
        const data = await response.json();
        
        if (data.success) {
            const list = document.getElementById('leaderboard-list');
            list.innerHTML = '';
            
            if (data.data.length === 0) {
                list.innerHTML = '<div class="loading-text">Leaderboard verisi bulunamadı</div>';
                return;
            }
            
            data.data.forEach((user, index) => {
                const item = document.createElement('div');
                item.className = 'leader-item';
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-size: 1.2rem; font-weight: bold; color: var(--primary-color); min-width: 30px;">
                            #${user.rank}
                        </span>
                        <div>
                            <strong>${user.username || user.displayName}</strong>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 2px 0;">
                                ${user.channelName || 'Bilinmiyor'}
                            </p>
                        </div>
                    </div>
                    <span style="font-weight: bold; color: var(--accent-color);">${user.messageCount} MSJ</span>
                `;
                list.appendChild(item);
            });
        }
        
        // Load server stats
        const statsRes = await fetch(`/api/server/${guildId}/stats`);
        const statsData = await statsRes.json();
        
        if (statsData.success) {
            document.getElementById('stat-members').textContent = statsData.data.membersCount.toLocaleString();
            document.getElementById('stat-active').textContent = statsData.data.uniqueActiveUsers;
            document.getElementById('stat-messages').textContent = statsData.data.totalMessages.toLocaleString();
            document.getElementById('stat-conversations').textContent = statsData.data.totalConversations.toLocaleString();
        }
    } catch (error) {
        console.error('Leaderboard load error:', error);
    }
}

// User search
document.getElementById('btn-search-user')?.addEventListener('click', async function() {
    const userId = document.getElementById('user-search-id').value;
    
    if (!userId.trim()) {
        showNotification('Lütfen kullanıcı ID\'sini girin', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/server/${guildId}/user/${userId}/profile`);
        const data = await response.json();
        
        if (data.success) {
            const profile = data.data;
            const detail = document.getElementById('user-profile-detail');
            detail.innerHTML = `
                <div style="background: rgba(88,101,242,0.1); padding: 20px; border-radius: 12px;">
                    <div style="display: flex; gap: 20px; align-items: start;">
                        <img src="${profile.avatar}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%;">
                        <div style="flex: 1;">
                            <h3>${profile.username}</h3>
                            <p style="color: var(--text-muted); margin: 8px 0;">ID: ${profile.userId}</p>
                            <p style="margin: 5px 0;">📊 Mesajlar: <strong>${profile.messageCount}</strong></p>
                            <p style="margin: 5px 0;">💬 Konuşmalar: <strong>${profile.conversationCount}</strong></p>
                            <p style="margin: 5px 0;">📅 Katıldı: <strong>${new Date(profile.joinedAt).toLocaleDateString('tr-TR')}</strong></p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Profil yüklenirken hata oluştu', 'error');
    }
});

// ========== UTILITY FUNCTIONS ==========
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--error-color)' : 'var(--warning-color)'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animations to stylesheet dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Token refresh every 30 minutes
setInterval(() => {
    fetch('/auth/refresh-token').then(() => {
        console.log('[AUTH] Token refreshed');
    }).catch(err => {
        console.error('[AUTH] Token refresh failed:', err);
        // Redirect to login if token refresh fails
        if (err.status === 401) {
            window.location.href = '/auth/login';
        }
    });
}, 30 * 60 * 1000); // 30 minutes
