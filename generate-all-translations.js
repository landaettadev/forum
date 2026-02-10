const fs = require('fs');
const path = require('path');

// Read Spanish as reference
const esPath = path.join(__dirname, 'messages', 'es.json');
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

// Translation mappings for each language
const translations = {
  ko: {
    "badges.newbie": "초보자", "badges.active": "활동중", "badges.veteran": "베테랑", "badges.legend": "전설",
    "badges.admin": "관리자", "badges.moderator": "중재자", "badges.verified": "인증됨", "badges.contributions": "기여",
    "common.home": "홈", "common.search": "검색", "common.login": "로그인", "common.register": "가입",
    "common.logout": "로그아웃", "common.myAccount": "내 계정", "common.messages": "메시지", "common.favorites": "즐겨찾기",
    "common.alerts": "알림", "common.admin": "관리", "common.settings": "설정", "common.save": "저장",
    "common.cancel": "취소", "common.loading": "로딩...", "common.error": "오류", "common.success": "성공",
    "nav.forums": "포럼", "nav.rules": "규칙", "nav.vip": "VIP", "nav.verification": "인증",
    "nav.newThread": "새 글", "nav.ads": "광고",
    "sidebar.forumStats": "포럼 통계", "sidebar.totalUsers": "등록 사용자", "sidebar.totalThreads": "스레드",
    "sidebar.totalPosts": "게시물", "sidebar.onlineNow": "현재 온라인", "sidebar.reputation": "평판 및 배지",
    "ads.title": "광고", "ads.createAd": "광고 게시", "ads.noAds": "광고 없음",
    "alerts.title": "지역 알림", "alerts.loginRequired": "로그인 필요"
  },
  hi: {
    "badges.newbie": "नौसिखिया", "badges.active": "सक्रिय", "badges.veteran": "अनुभवी", "badges.legend": "किंवदंती",
    "badges.admin": "व्यवस्थापक", "badges.moderator": "मॉडरेटर", "badges.verified": "सत्यापित", "badges.contributions": "योगदान",
    "common.home": "होम", "common.search": "खोजें", "common.login": "लॉगिन", "common.register": "पंजीकरण",
    "common.logout": "लॉगआउट", "common.myAccount": "मेरा खाता", "common.messages": "संदेश", "common.favorites": "पसंदीदा",
    "common.alerts": "अलर्ट", "common.admin": "व्यवस्थापक", "common.settings": "सेटिंग्स", "common.save": "सहेजें",
    "common.cancel": "रद्द करें", "common.loading": "लोड हो रहा है...", "common.error": "त्रुटि", "common.success": "सफलता",
    "nav.forums": "फ़ोरम", "nav.rules": "नियम", "nav.vip": "VIP", "nav.verification": "सत्यापन",
    "nav.newThread": "नया थ्रेड", "nav.ads": "विज्ञापन",
    "sidebar.forumStats": "फोरम आँकड़े", "sidebar.totalUsers": "पंजीकृत उपयोगकर्ता", "sidebar.reputation": "प्रतिष्ठा और बैज",
    "ads.title": "विज्ञापन", "ads.createAd": "विज्ञापन पोस्ट करें", "ads.noAds": "कोई विज्ञापन नहीं",
    "alerts.title": "क्षेत्र अलर्ट", "alerts.loginRequired": "लॉगिन आवश्यक"
  },
  th: {
    "badges.newbie": "มือใหม่", "badges.active": "ใช้งาน", "badges.veteran": "ทหารผ่านศึก", "badges.legend": "ตำนาน",
    "badges.admin": "ผู้ดูแล", "badges.moderator": "ผู้ตรวจสอบ", "badges.verified": "ยืนยันแล้ว", "badges.contributions": "การมีส่วนร่วม",
    "common.home": "หน้าแรก", "common.search": "ค้นหา", "common.login": "เข้าสู่ระบบ", "common.register": "ลงทะเบียน",
    "common.logout": "ออกจากระบบ", "common.myAccount": "บัญชีของฉัน", "common.messages": "ข้อความ", "common.favorites": "รายการโปรด",
    "common.alerts": "การแจ้งเตือน", "common.admin": "ผู้ดูแล", "common.settings": "ตั้งค่า", "common.save": "บันทึก",
    "common.cancel": "ยกเลิก", "common.loading": "กำลังโหลด...", "common.error": "ข้อผิดพลาด", "common.success": "สำเร็จ",
    "nav.forums": "ฟอรั่ม", "nav.rules": "กฎ", "nav.vip": "VIP", "nav.verification": "การยืนยัน",
    "nav.newThread": "กระทู้ใหม่", "nav.ads": "โฆษณา",
    "sidebar.forumStats": "สถิติฟอรั่ม", "sidebar.totalUsers": "ผู้ใช้ที่ลงทะเบียน", "sidebar.reputation": "ชื่อเสียงและตรา",
    "ads.title": "โฆษณา", "ads.createAd": "ลงโฆษณา", "ads.noAds": "ไม่มีโฆษณา",
    "alerts.title": "การแจ้งเตือนพื้นที่", "alerts.loginRequired": "ต้องเข้าสู่ระบบ"
  },
  id: {
    "badges.newbie": "Pemula", "badges.active": "Aktif", "badges.veteran": "Veteran", "badges.legend": "Legenda",
    "badges.admin": "Admin", "badges.moderator": "Moderator", "badges.verified": "Terverifikasi", "badges.contributions": "kontribusi",
    "common.home": "Beranda", "common.search": "Cari", "common.login": "Masuk", "common.register": "Daftar",
    "common.logout": "Keluar", "common.myAccount": "Akun Saya", "common.messages": "Pesan", "common.favorites": "Favorit",
    "common.alerts": "Peringatan", "common.admin": "Admin", "common.settings": "Pengaturan", "common.save": "Simpan",
    "common.cancel": "Batal", "common.loading": "Memuat...", "common.error": "Error", "common.success": "Berhasil",
    "nav.forums": "Forum", "nav.rules": "Aturan", "nav.vip": "VIP", "nav.verification": "Verifikasi",
    "nav.newThread": "Thread Baru", "nav.ads": "Iklan",
    "sidebar.forumStats": "Statistik Forum", "sidebar.totalUsers": "Pengguna terdaftar", "sidebar.reputation": "Reputasi dan Lencana",
    "ads.title": "Iklan", "ads.createAd": "Pasang Iklan", "ads.noAds": "Tidak ada iklan",
    "alerts.title": "Peringatan Zona", "alerts.loginRequired": "Login diperlukan"
  },
  nl: {
    "badges.newbie": "Nieuweling", "badges.active": "Actief", "badges.veteran": "Veteraan", "badges.legend": "Legende",
    "badges.admin": "Admin", "badges.moderator": "Moderator", "badges.verified": "Geverifieerd", "badges.contributions": "bijdragen",
    "common.home": "Home", "common.search": "Zoeken", "common.login": "Inloggen", "common.register": "Registreren",
    "common.logout": "Uitloggen", "common.myAccount": "Mijn Account", "common.messages": "Berichten", "common.favorites": "Favorieten",
    "common.alerts": "Meldingen", "common.admin": "Admin", "common.settings": "Instellingen", "common.save": "Opslaan",
    "common.cancel": "Annuleren", "common.loading": "Laden...", "common.error": "Fout", "common.success": "Succes",
    "nav.forums": "Forums", "nav.rules": "Regels", "nav.vip": "VIP", "nav.verification": "Verificatie",
    "nav.newThread": "Nieuwe Thread", "nav.ads": "Advertenties",
    "sidebar.forumStats": "Forumstatistieken", "sidebar.totalUsers": "Geregistreerde gebruikers", "sidebar.reputation": "Reputatie en Badges",
    "ads.title": "Advertenties", "ads.createAd": "Advertentie Plaatsen", "ads.noAds": "Geen advertenties",
    "alerts.title": "Zone Meldingen", "alerts.loginRequired": "Inloggen vereist"
  },
  pl: {
    "badges.newbie": "Nowicjusz", "badges.active": "Aktywny", "badges.veteran": "Weteran", "badges.legend": "Legenda",
    "badges.admin": "Admin", "badges.moderator": "Moderator", "badges.verified": "Zweryfikowany", "badges.contributions": "wkładów",
    "common.home": "Strona główna", "common.search": "Szukaj", "common.login": "Zaloguj", "common.register": "Zarejestruj",
    "common.logout": "Wyloguj", "common.myAccount": "Moje Konto", "common.messages": "Wiadomości", "common.favorites": "Ulubione",
    "common.alerts": "Powiadomienia", "common.admin": "Admin", "common.settings": "Ustawienia", "common.save": "Zapisz",
    "common.cancel": "Anuluj", "common.loading": "Ładowanie...", "common.error": "Błąd", "common.success": "Sukces",
    "nav.forums": "Fora", "nav.rules": "Zasady", "nav.vip": "VIP", "nav.verification": "Weryfikacja",
    "nav.newThread": "Nowy Wątek", "nav.ads": "Ogłoszenia",
    "sidebar.forumStats": "Statystyki Forum", "sidebar.totalUsers": "Zarejestrowani użytkownicy", "sidebar.reputation": "Reputacja i Odznaki",
    "ads.title": "Ogłoszenia", "ads.createAd": "Dodaj Ogłoszenie", "ads.noAds": "Brak ogłoszeń",
    "alerts.title": "Alerty Strefowe", "alerts.loginRequired": "Wymagane logowanie"
  },
  sv: {
    "badges.newbie": "Nybörjare", "badges.active": "Aktiv", "badges.veteran": "Veteran", "badges.legend": "Legend",
    "badges.admin": "Admin", "badges.moderator": "Moderator", "badges.verified": "Verifierad", "badges.contributions": "bidrag",
    "common.home": "Hem", "common.search": "Sök", "common.login": "Logga in", "common.register": "Registrera",
    "common.logout": "Logga ut", "common.myAccount": "Mitt Konto", "common.messages": "Meddelanden", "common.favorites": "Favoriter",
    "common.alerts": "Varningar", "common.admin": "Admin", "common.settings": "Inställningar", "common.save": "Spara",
    "common.cancel": "Avbryt", "common.loading": "Laddar...", "common.error": "Fel", "common.success": "Framgång",
    "nav.forums": "Forum", "nav.rules": "Regler", "nav.vip": "VIP", "nav.verification": "Verifiering",
    "nav.newThread": "Ny Tråd", "nav.ads": "Annonser",
    "sidebar.forumStats": "Forumstatistik", "sidebar.totalUsers": "Registrerade användare", "sidebar.reputation": "Rykte och Märken",
    "ads.title": "Annonser", "ads.createAd": "Lägg till Annons", "ads.noAds": "Inga annonser",
    "alerts.title": "Zonvarningar", "alerts.loginRequired": "Inloggning krävs"
  },
  tr: {
    "badges.newbie": "Çaylak", "badges.active": "Aktif", "badges.veteran": "Kıdemli", "badges.legend": "Efsane",
    "badges.admin": "Yönetici", "badges.moderator": "Moderatör", "badges.verified": "Doğrulanmış", "badges.contributions": "katkı",
    "common.home": "Ana Sayfa", "common.search": "Ara", "common.login": "Giriş", "common.register": "Kayıt",
    "common.logout": "Çıkış", "common.myAccount": "Hesabım", "common.messages": "Mesajlar", "common.favorites": "Favoriler",
    "common.alerts": "Uyarılar", "common.admin": "Yönetici", "common.settings": "Ayarlar", "common.save": "Kaydet",
    "common.cancel": "İptal", "common.loading": "Yükleniyor...", "common.error": "Hata", "common.success": "Başarılı",
    "nav.forums": "Forumlar", "nav.rules": "Kurallar", "nav.vip": "VIP", "nav.verification": "Doğrulama",
    "nav.newThread": "Yeni Konu", "nav.ads": "İlanlar",
    "sidebar.forumStats": "Forum İstatistikleri", "sidebar.totalUsers": "Kayıtlı kullanıcılar", "sidebar.reputation": "İtibar ve Rozetler",
    "ads.title": "İlanlar", "ads.createAd": "İlan Ver", "ads.noAds": "İlan yok",
    "alerts.title": "Bölge Uyarıları", "alerts.loginRequired": "Giriş gerekli"
  },
  ar: {
    "badges.newbie": "مبتدئ", "badges.active": "نشط", "badges.veteran": "محترف", "badges.legend": "أسطورة",
    "badges.admin": "مدير", "badges.moderator": "مشرف", "badges.verified": "موثق", "badges.contributions": "مساهمات",
    "common.home": "الرئيسية", "common.search": "بحث", "common.login": "تسجيل الدخول", "common.register": "تسجيل",
    "common.logout": "تسجيل الخروج", "common.myAccount": "حسابي", "common.messages": "الرسائل", "common.favorites": "المفضلة",
    "common.alerts": "التنبيهات", "common.admin": "المدير", "common.settings": "الإعدادات", "common.save": "حفظ",
    "common.cancel": "إلغاء", "common.loading": "جاري التحميل...", "common.error": "خطأ", "common.success": "نجاح",
    "nav.forums": "المنتديات", "nav.rules": "القواعد", "nav.vip": "VIP", "nav.verification": "التحقق",
    "nav.newThread": "موضوع جديد", "nav.ads": "الإعلانات",
    "sidebar.forumStats": "إحصائيات المنتدى", "sidebar.totalUsers": "المستخدمون المسجلون", "sidebar.reputation": "السمعة والشارات",
    "ads.title": "الإعلانات", "ads.createAd": "نشر إعلان", "ads.noAds": "لا توجد إعلانات",
    "alerts.title": "تنبيهات المنطقة", "alerts.loginRequired": "تسجيل الدخول مطلوب"
  },
  ru: {
    // badges
    "badges.newbie": "Новичок",
    "badges.active": "Активный",
    "badges.veteran": "Ветеран",
    "badges.legend": "Легенда",
    "badges.admin": "Админ",
    "badges.moderator": "Модератор",
    "badges.verified": "Подтверждён",
    "badges.contributions": "вкладов",
    // common
    "common.home": "Главная",
    "common.search": "Поиск",
    "common.login": "Войти",
    "common.register": "Регистрация",
    "common.logout": "Выход",
    "common.myAccount": "Мой аккаунт",
    "common.messages": "Сообщения",
    "common.favorites": "Избранное",
    "common.alerts": "Уведомления",
    "common.admin": "Админ",
    "common.settings": "Настройки",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.loading": "Загрузка...",
    "common.error": "Ошибка",
    "common.success": "Успешно",
    // nav
    "nav.forums": "Форумы",
    "nav.rules": "Правила",
    "nav.vip": "VIP",
    "nav.verification": "Верификация",
    "nav.newThread": "Новая тема",
    "nav.ads": "Объявления",
    // sidebar
    "sidebar.forumStats": "Статистика форума",
    "sidebar.totalUsers": "Пользователей",
    "sidebar.totalThreads": "Тем создано",
    "sidebar.totalPosts": "Сообщений",
    "sidebar.onlineNow": "Сейчас онлайн",
    "sidebar.noUsersOnline": "Нет пользователей онлайн",
    "sidebar.staffOnline": "Персонал онлайн",
    "sidebar.recentActivity": "Последняя активность",
    "sidebar.usefulLinks": "Полезные ссылки",
    "sidebar.rules": "Правила форума",
    "sidebar.verification": "Верификация",
    "sidebar.advancedSearch": "Расширенный поиск",
    "sidebar.faq": "FAQ / Помощь",
    "sidebar.contact": "Контакты",
    "sidebar.reputation": "Репутация и значки",
    // ads namespace
    "ads.title": "Объявления",
    "ads.subtitle": "{count} объявлений доступно",
    "ads.createAd": "Разместить объявление",
    "ads.selectCountry": "Выбрать страну",
    "ads.selectRegion": "Выбрать регион",
    "ads.allCountries": "Все страны",
    "ads.allRegions": "Все регионы",
    "ads.noAds": "Нет объявлений",
    "ads.featured": "Рекомендуемое",
    "ads.verified": "Проверено",
    "ads.years": "лет",
    "ads.incall": "Приём",
    "ads.outcall": "Выезд",
    "ads.from": "От",
    "ads.views": "Просмотров",
    "ads.favorites": "Избранное",
    "ads.published": "Опубликовано",
    "ads.backToAds": "К объявлениям",
    "ads.description": "Описание",
    "ads.services": "Услуги",
    "ads.availability": "Доступность",
    "ads.contact": "Контакт",
    "ads.showContact": "Показать контакт",
    "ads.rates": "Тарифы",
    "ads.details": "Детали",
    // alerts
    "alerts.title": "Уведомления зоны",
    "alerts.description": "Получайте уведомления о новых объявлениях",
    "alerts.addAlert": "Добавить уведомление",
    "alerts.yourAlerts": "Ваши уведомления",
    "alerts.noAlerts": "Нет настроенных уведомлений",
    "alerts.active": "Активно",
    "alerts.paused": "Приостановлено",
    "alerts.alertAdded": "Уведомление добавлено",
    "alerts.alertDeleted": "Уведомление удалено",
    "alerts.loginRequired": "Войдите для настройки"
  },
  zh: {
    // badges
    "badges.newbie": "新手",
    "badges.active": "活跃",
    "badges.veteran": "资深",
    "badges.legend": "传奇",
    "badges.admin": "管理员",
    "badges.moderator": "版主",
    "badges.verified": "已验证",
    "badges.contributions": "贡献",
    // common
    "common.home": "首页",
    "common.search": "搜索",
    "common.login": "登录",
    "common.register": "注册",
    "common.logout": "退出",
    "common.myAccount": "我的账户",
    "common.messages": "消息",
    "common.favorites": "我的收藏",
    "common.alerts": "提醒",
    "common.admin": "管理",
    "common.settings": "设置",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.loading": "加载中...",
    "common.error": "错误",
    "common.success": "成功",
    // nav
    "nav.forums": "论坛",
    "nav.rules": "规则",
    "nav.vip": "VIP",
    "nav.verification": "验证",
    "nav.newThread": "发帖",
    "nav.ads": "广告",
    // sidebar
    "sidebar.forumStats": "论坛统计",
    "sidebar.totalUsers": "注册用户",
    "sidebar.totalThreads": "主题数",
    "sidebar.totalPosts": "帖子数",
    "sidebar.onlineNow": "当前在线",
    "sidebar.noUsersOnline": "没有在线用户",
    "sidebar.staffOnline": "在线工作人员",
    "sidebar.recentActivity": "最近活动",
    "sidebar.usefulLinks": "有用链接",
    "sidebar.rules": "论坛规则",
    "sidebar.verification": "验证",
    "sidebar.advancedSearch": "高级搜索",
    "sidebar.faq": "常见问题",
    "sidebar.contact": "联系我们",
    "sidebar.reputation": "声誉和徽章",
    // ads
    "ads.title": "广告",
    "ads.subtitle": "{count}条广告",
    "ads.createAd": "发布广告",
    "ads.selectCountry": "选择国家",
    "ads.selectRegion": "选择地区",
    "ads.allCountries": "所有国家",
    "ads.allRegions": "所有地区",
    "ads.noAds": "暂无广告",
    "ads.featured": "精选",
    "ads.verified": "已验证",
    "ads.years": "岁",
    "ads.incall": "接待",
    "ads.outcall": "上门",
    "ads.from": "起价",
    "ads.views": "浏览",
    "ads.favorites": "收藏",
    "ads.published": "发布于",
    "ads.backToAds": "返回广告",
    "ads.description": "描述",
    "ads.services": "服务",
    "ads.availability": "可用时间",
    "ads.contact": "联系方式",
    "ads.showContact": "显示联系方式",
    "ads.rates": "价格",
    "ads.details": "详情",
    // alerts
    "alerts.title": "区域提醒",
    "alerts.description": "收到新广告通知",
    "alerts.addAlert": "添加提醒",
    "alerts.yourAlerts": "您的提醒",
    "alerts.noAlerts": "没有设置提醒",
    "alerts.active": "活跃",
    "alerts.paused": "暂停",
    "alerts.alertAdded": "提醒已添加",
    "alerts.alertDeleted": "提醒已删除",
    "alerts.loginRequired": "请登录设置"
  },
  ja: {
    // badges
    "badges.newbie": "初心者",
    "badges.active": "アクティブ",
    "badges.veteran": "ベテラン",
    "badges.legend": "レジェンド",
    "badges.admin": "管理者",
    "badges.moderator": "モデレーター",
    "badges.verified": "認証済み",
    "badges.contributions": "貢献",
    // common
    "common.home": "ホーム",
    "common.search": "検索",
    "common.login": "ログイン",
    "common.register": "登録",
    "common.logout": "ログアウト",
    "common.myAccount": "マイアカウント",
    "common.messages": "メッセージ",
    "common.favorites": "お気に入り",
    "common.alerts": "通知",
    "common.admin": "管理",
    "common.settings": "設定",
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.loading": "読み込み中...",
    "common.error": "エラー",
    "common.success": "成功",
    // nav
    "nav.forums": "フォーラム",
    "nav.rules": "ルール",
    "nav.vip": "VIP",
    "nav.verification": "認証",
    "nav.newThread": "新規スレッド",
    "nav.ads": "広告",
    // sidebar
    "sidebar.forumStats": "フォーラム統計",
    "sidebar.totalUsers": "登録ユーザー",
    "sidebar.totalThreads": "スレッド数",
    "sidebar.totalPosts": "投稿数",
    "sidebar.onlineNow": "オンライン中",
    "sidebar.noUsersOnline": "オンラインユーザーなし",
    "sidebar.staffOnline": "スタッフオンライン",
    "sidebar.recentActivity": "最近のアクティビティ",
    "sidebar.usefulLinks": "便利なリンク",
    "sidebar.rules": "フォーラムルール",
    "sidebar.verification": "認証",
    "sidebar.advancedSearch": "詳細検索",
    "sidebar.faq": "FAQ / ヘルプ",
    "sidebar.contact": "お問い合わせ",
    "sidebar.reputation": "評判とバッジ",
    // ads
    "ads.title": "広告",
    "ads.subtitle": "{count}件の広告",
    "ads.createAd": "広告を掲載",
    "ads.selectCountry": "国を選択",
    "ads.selectRegion": "地域を選択",
    "ads.allCountries": "すべての国",
    "ads.allRegions": "すべての地域",
    "ads.noAds": "広告がありません",
    "ads.featured": "おすすめ",
    "ads.verified": "認証済み",
    "ads.years": "歳",
    "ads.incall": "来店",
    "ads.outcall": "出張",
    "ads.from": "から",
    "ads.views": "閲覧",
    "ads.favorites": "お気に入り",
    "ads.published": "公開日",
    "ads.backToAds": "広告に戻る",
    "ads.description": "説明",
    "ads.services": "サービス",
    "ads.availability": "空き状況",
    "ads.contact": "連絡先",
    "ads.showContact": "連絡先を表示",
    "ads.rates": "料金",
    "ads.details": "詳細",
    // alerts
    "alerts.title": "エリア通知",
    "alerts.description": "新しい広告の通知を受け取る",
    "alerts.addAlert": "通知を追加",
    "alerts.yourAlerts": "通知設定",
    "alerts.noAlerts": "通知が設定されていません",
    "alerts.active": "アクティブ",
    "alerts.paused": "一時停止",
    "alerts.alertAdded": "通知を追加しました",
    "alerts.alertDeleted": "通知を削除しました",
    "alerts.loginRequired": "ログインして設定"
  }
};

// Function to set nested value
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Function to deep clone
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Generate translations for each language
Object.keys(translations).forEach(lang => {
  // Start with Spanish as base (to get all keys)
  const langData = deepClone(es);
  
  // Apply translations
  Object.entries(translations[lang]).forEach(([path, value]) => {
    setNestedValue(langData, path, value);
  });
  
  // Write file
  const outPath = path.join(__dirname, 'messages', `${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(langData, null, 2), 'utf8');
  console.log(`Generated ${lang}.json`);
});

console.log('All translations generated!');
