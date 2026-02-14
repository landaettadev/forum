/**
 * Comprehensive translation generator for all languages.
 * Reads es.json as reference, applies translations to each language file.
 * Only overwrites values that still match the Spanish original (untranslated).
 */
const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, '..', 'messages');
const es = JSON.parse(fs.readFileSync(path.join(messagesDir, 'es.json'), 'utf8'));

// Flatten an object to dot-notation keys
function flatten(obj, prefix = '') {
  const result = {};
  for (const k in obj) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      Object.assign(result, flatten(obj[k], p));
    } else {
      result[p] = obj[k];
    }
  }
  return result;
}

// Unflatten dot-notation keys back to nested object
function unflatten(obj) {
  const result = {};
  for (const key in obj) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = obj[key];
  }
  return result;
}

const esFlat = flatten(es);

// ============================================================
// TRANSLATION MAPS - key: Spanish value, value: { lang: translation }
// ============================================================

const T = {
  // --- BADGES ---
  "Novato": { en:"Newbie", pt:"Novato", fr:"Novice", de:"Neuling", it:"Principiante", nl:"Nieuweling", ja:"初心者", zh:"新手", ru:"Новичок", ar:"مبتدئ", hi:"नौसिखिया", ko:"초보자", tr:"Çaylak", pl:"Nowicjusz", sv:"Nybörjare", id:"Pemula", th:"มือใหม่" },
  "Activo": { en:"Active", pt:"Ativo", fr:"Actif", de:"Aktiv", it:"Attivo", nl:"Actief", ja:"アクティブ", zh:"活跃", ru:"Активный", ar:"نشط", hi:"सक्रिय", ko:"활동적", tr:"Aktif", pl:"Aktywny", sv:"Aktiv", id:"Aktif", th:"ใช้งานอยู่" },
  "Veterano": { en:"Veteran", pt:"Veterano", fr:"Vétéran", de:"Veteran", it:"Veterano", nl:"Veteraan", ja:"ベテラン", zh:"老手", ru:"Ветеран", ar:"محترف", hi:"अनुभवी", ko:"베테랑", tr:"Deneyimli", pl:"Weteran", sv:"Veteran", id:"Veteran", th:"ทหารผ่านศึก" },
  "Leyenda": { en:"Legend", pt:"Lenda", fr:"Légende", de:"Legende", it:"Leggenda", nl:"Legende", ja:"レジェンド", zh:"传奇", ru:"Легенда", ar:"أسطورة", hi:"दिग्गज", ko:"레전드", tr:"Efsane", pl:"Legenda", sv:"Legend", id:"Legenda", th:"ตำนาน" },
  "Admin": { en:"Admin", pt:"Admin", fr:"Admin", de:"Admin", it:"Admin", nl:"Admin", ja:"管理者", zh:"管理员", ru:"Админ", ar:"مشرف", hi:"व्यवस्थापक", ko:"관리자", tr:"Yönetici", pl:"Admin", sv:"Admin", id:"Admin", th:"ผู้ดูแล" },
  "Moderador": { en:"Moderator", pt:"Moderador", fr:"Modérateur", de:"Moderator", it:"Moderatore", nl:"Moderator", ja:"モデレーター", zh:"版主", ru:"Модератор", ar:"مشرف", hi:"मॉडरेटर", ko:"모더레이터", tr:"Moderatör", pl:"Moderator", sv:"Moderator", id:"Moderator", th:"ผู้ดูแล" },
  "Verificado": { en:"Verified", pt:"Verificado", fr:"Vérifié", de:"Verifiziert", it:"Verificato", nl:"Geverifieerd", ja:"認証済み", zh:"已验证", ru:"Подтверждён", ar:"موثق", hi:"सत्यापित", ko:"인증됨", tr:"Doğrulanmış", pl:"Zweryfikowany", sv:"Verifierad", id:"Terverifikasi", th:"ยืนยันแล้ว" },
  "contribuciones": { en:"contributions", pt:"contribuições", fr:"contributions", de:"Beiträge", it:"contributi", nl:"bijdragen", ja:"貢献", zh:"贡献", ru:"вклады", ar:"مساهمات", hi:"योगदान", ko:"기여", tr:"katkılar", pl:"kontrybucje", sv:"bidrag", id:"kontribusi", th:"การมีส่วนร่วม" },

  // --- NAV ---
  "Inicio": { en:"Home", pt:"Início", fr:"Accueil", de:"Startseite", it:"Home", nl:"Home", ja:"ホーム", zh:"首页", ru:"Главная", ar:"الرئيسية", hi:"होम", ko:"홈", tr:"Ana Sayfa", pl:"Strona główna", sv:"Hem", id:"Beranda", th:"หน้าแรก" },
  "Feed": { en:"Feed", pt:"Feed", fr:"Fil", de:"Feed", it:"Feed", nl:"Feed", ja:"フィード", zh:"动态", ru:"Лента", ar:"آخر التحديثات", hi:"फ़ीड", ko:"피드", tr:"Akış", pl:"Aktualności", sv:"Flöde", id:"Feed", th:"ฟีด" },
  "Buscar": { en:"Search", pt:"Buscar", fr:"Rechercher", de:"Suchen", it:"Cerca", nl:"Zoeken", ja:"検索", zh:"搜索", ru:"Поиск", ar:"بحث", hi:"खोजें", ko:"검색", tr:"Ara", pl:"Szukaj", sv:"Sök", id:"Cari", th:"ค้นหา" },
  "Reglas": { en:"Rules", pt:"Regras", fr:"Règles", de:"Regeln", it:"Regole", nl:"Regels", ja:"ルール", zh:"规则", ru:"Правила", ar:"القواعد", hi:"नियम", ko:"규칙", tr:"Kurallar", pl:"Regulamin", sv:"Regler", id:"Aturan", th:"กฎ" },
  "Publicidad": { en:"Advertising", pt:"Publicidade", fr:"Publicité", de:"Werbung", it:"Pubblicità", nl:"Advertentie", ja:"広告", zh:"广告", ru:"Реклама", ar:"إعلانات", hi:"विज्ञापन", ko:"광고", tr:"Reklam", pl:"Reklama", sv:"Reklam", id:"Iklan", th:"โฆษณา" },

  // --- COMMON ---
  "Cancelar": { en:"Cancel", pt:"Cancelar", fr:"Annuler", de:"Abbrechen", it:"Annulla", nl:"Annuleren", ja:"キャンセル", zh:"取消", ru:"Отмена", ar:"إلغاء", hi:"रद्द करें", ko:"취소", tr:"İptal", pl:"Anuluj", sv:"Avbryt", id:"Batal", th:"ยกเลิก" },
  "Guardar": { en:"Save", pt:"Salvar", fr:"Enregistrer", de:"Speichern", it:"Salva", nl:"Opslaan", ja:"保存", zh:"保存", ru:"Сохранить", ar:"حفظ", hi:"सहेजें", ko:"저장", tr:"Kaydet", pl:"Zapisz", sv:"Spara", id:"Simpan", th:"บันทึก" },
  "Enviar": { en:"Send", pt:"Enviar", fr:"Envoyer", de:"Senden", it:"Invia", nl:"Verzenden", ja:"送信", zh:"发送", ru:"Отправить", ar:"إرسال", hi:"भेजें", ko:"보내기", tr:"Gönder", pl:"Wyślij", sv:"Skicka", id:"Kirim", th:"ส่ง" },
  "Eliminar": { en:"Delete", pt:"Excluir", fr:"Supprimer", de:"Löschen", it:"Elimina", nl:"Verwijderen", ja:"削除", zh:"删除", ru:"Удалить", ar:"حذف", hi:"हटाएं", ko:"삭제", tr:"Sil", pl:"Usuń", sv:"Ta bort", id:"Hapus", th:"ลบ" },
  "Editar": { en:"Edit", pt:"Editar", fr:"Modifier", de:"Bearbeiten", it:"Modifica", nl:"Bewerken", ja:"編集", zh:"编辑", ru:"Редактировать", ar:"تعديل", hi:"संपादित करें", ko:"편집", tr:"Düzenle", pl:"Edytuj", sv:"Redigera", id:"Edit", th:"แก้ไข" },
  "Confirmar": { en:"Confirm", pt:"Confirmar", fr:"Confirmer", de:"Bestätigen", it:"Conferma", nl:"Bevestigen", ja:"確認", zh:"确认", ru:"Подтвердить", ar:"تأكيد", hi:"पुष्टि करें", ko:"확인", tr:"Onayla", pl:"Potwierdź", sv:"Bekräfta", id:"Konfirmasi", th:"ยืนยัน" },
  "Cargando...": { en:"Loading...", pt:"Carregando...", fr:"Chargement...", de:"Laden...", it:"Caricamento...", nl:"Laden...", ja:"読み込み中...", zh:"加载中...", ru:"Загрузка...", ar:"جاري التحميل...", hi:"लोड हो रहा है...", ko:"로딩...", tr:"Yükleniyor...", pl:"Ładowanie...", sv:"Laddar...", id:"Memuat...", th:"กำลังโหลด..." },
  "Cargar más": { en:"Load more", pt:"Carregar mais", fr:"Charger plus", de:"Mehr laden", it:"Carica altro", nl:"Meer laden", ja:"もっと読み込む", zh:"加载更多", ru:"Загрузить ещё", ar:"تحميل المزيد", hi:"और लोड करें", ko:"더 보기", tr:"Daha fazla yükle", pl:"Załaduj więcej", sv:"Ladda fler", id:"Muat lebih banyak", th:"โหลดเพิ่มเติม" },
  "Cerrar": { en:"Close", pt:"Fechar", fr:"Fermer", de:"Schließen", it:"Chiudi", nl:"Sluiten", ja:"閉じる", zh:"关闭", ru:"Закрыть", ar:"إغلاق", hi:"बंद करें", ko:"닫기", tr:"Kapat", pl:"Zamknij", sv:"Stäng", id:"Tutup", th:"ปิด" },
  "Atrás": { en:"Back", pt:"Voltar", fr:"Retour", de:"Zurück", it:"Indietro", nl:"Terug", ja:"戻る", zh:"返回", ru:"Назад", ar:"رجوع", hi:"वापस", ko:"뒤로", tr:"Geri", pl:"Wstecz", sv:"Tillbaka", id:"Kembali", th:"กลับ" },
  "Siguiente": { en:"Next", pt:"Próximo", fr:"Suivant", de:"Weiter", it:"Avanti", nl:"Volgende", ja:"次へ", zh:"下一步", ru:"Далее", ar:"التالي", hi:"अगला", ko:"다음", tr:"İleri", pl:"Dalej", sv:"Nästa", id:"Berikutnya", th:"ถัดไป" },
  "Anterior": { en:"Previous", pt:"Anterior", fr:"Précédent", de:"Zurück", it:"Precedente", nl:"Vorige", ja:"前へ", zh:"上一步", ru:"Назад", ar:"السابق", hi:"पिछला", ko:"이전", tr:"Önceki", pl:"Poprzedni", sv:"Föregående", id:"Sebelumnya", th:"ก่อนหน้า" },
  "Sí": { en:"Yes", pt:"Sim", fr:"Oui", de:"Ja", it:"Sì", nl:"Ja", ja:"はい", zh:"是", ru:"Да", ar:"نعم", hi:"हाँ", ko:"예", tr:"Evet", pl:"Tak", sv:"Ja", id:"Ya", th:"ใช่" },
  "No": { en:"No", pt:"Não", fr:"Non", de:"Nein", it:"No", nl:"Nee", ja:"いいえ", zh:"否", ru:"Нет", ar:"لا", hi:"नहीं", ko:"아니오", tr:"Hayır", pl:"Nie", sv:"Nej", id:"Tidak", th:"ไม่" },
  "Compartir": { en:"Share", pt:"Compartilhar", fr:"Partager", de:"Teilen", it:"Condividi", nl:"Delen", ja:"共有", zh:"分享", ru:"Поделиться", ar:"مشاركة", hi:"साझा करें", ko:"공유", tr:"Paylaş", pl:"Udostępnij", sv:"Dela", id:"Bagikan", th:"แชร์" },
  "Copiar enlace": { en:"Copy link", pt:"Copiar link", fr:"Copier le lien", de:"Link kopieren", it:"Copia link", nl:"Link kopiëren", ja:"リンクをコピー", zh:"复制链接", ru:"Копировать ссылку", ar:"نسخ الرابط", hi:"लिंक कॉपी करें", ko:"링크 복사", tr:"Bağlantıyı kopyala", pl:"Kopiuj link", sv:"Kopiera länk", id:"Salin tautan", th:"คัดลอกลิงก์" },
  "Enlace copiado": { en:"Link copied", pt:"Link copiado", fr:"Lien copié", de:"Link kopiert", it:"Link copiato", nl:"Link gekopieerd", ja:"リンクをコピーしました", zh:"链接已复制", ru:"Ссылка скопирована", ar:"تم نسخ الرابط", hi:"लिंक कॉपी किया गया", ko:"링크 복사됨", tr:"Bağlantı kopyalandı", pl:"Link skopiowany", sv:"Länk kopierad", id:"Tautan disalin", th:"คัดลอกลิงก์แล้ว" },
  "Reportar": { en:"Report", pt:"Denunciar", fr:"Signaler", de:"Melden", it:"Segnala", nl:"Rapporteren", ja:"報告", zh:"举报", ru:"Пожаловаться", ar:"إبلاغ", hi:"रिपोर्ट करें", ko:"신고", tr:"Şikayet et", pl:"Zgłoś", sv:"Rapportera", id:"Laporkan", th:"รายงาน" },
  "Opciones": { en:"Options", pt:"Opções", fr:"Options", de:"Optionen", it:"Opzioni", nl:"Opties", ja:"オプション", zh:"选项", ru:"Настройки", ar:"خيارات", hi:"विकल्प", ko:"옵션", tr:"Seçenekler", pl:"Opcje", sv:"Alternativ", id:"Opsi", th:"ตัวเลือก" },
  "Todos": { en:"All", pt:"Todos", fr:"Tous", de:"Alle", it:"Tutti", nl:"Alle", ja:"すべて", zh:"全部", ru:"Все", ar:"الكل", hi:"सभी", ko:"전체", tr:"Tümü", pl:"Wszystkie", sv:"Alla", id:"Semua", th:"ทั้งหมด" },
  "Ver más": { en:"See more", pt:"Ver mais", fr:"Voir plus", de:"Mehr sehen", it:"Vedi altro", nl:"Meer zien", ja:"もっと見る", zh:"查看更多", ru:"Показать ещё", ar:"عرض المزيد", hi:"और देखें", ko:"더 보기", tr:"Daha fazla gör", pl:"Zobacz więcej", sv:"Se mer", id:"Lihat lebih", th:"ดูเพิ่มเติม" },
  "Ver menos": { en:"See less", pt:"Ver menos", fr:"Voir moins", de:"Weniger sehen", it:"Vedi meno", nl:"Minder zien", ja:"閉じる", zh:"收起", ru:"Свернуть", ar:"عرض أقل", hi:"कम देखें", ko:"접기", tr:"Daha az gör", pl:"Zobacz mniej", sv:"Se mindre", id:"Lihat sedikit", th:"ดูน้อยลง" },
  "Resultados": { en:"Results", pt:"Resultados", fr:"Résultats", de:"Ergebnisse", it:"Risultati", nl:"Resultaten", ja:"結果", zh:"结果", ru:"Результаты", ar:"النتائج", hi:"परिणाम", ko:"결과", tr:"Sonuçlar", pl:"Wyniki", sv:"Resultat", id:"Hasil", th:"ผลลัพธ์" },
  "Sin resultados": { en:"No results", pt:"Sem resultados", fr:"Aucun résultat", de:"Keine Ergebnisse", it:"Nessun risultato", nl:"Geen resultaten", ja:"結果なし", zh:"无结果", ru:"Нет результатов", ar:"لا توجد نتائج", hi:"कोई परिणाम नहीं", ko:"결과 없음", tr:"Sonuç yok", pl:"Brak wyników", sv:"Inga resultat", id:"Tidak ada hasil", th:"ไม่มีผลลัพธ์" },

  // --- FORUM ---
  "Foros": { en:"Forums", pt:"Fóruns", fr:"Forums", de:"Foren", it:"Forum", nl:"Forums", ja:"フォーラム", zh:"论坛", ru:"Форумы", ar:"المنتديات", hi:"फ़ोरम", ko:"포럼", tr:"Forumlar", pl:"Fora", sv:"Forum", id:"Forum", th:"ฟอรั่ม" },
  "Explora los foros de la comunidad": { en:"Explore community forums", pt:"Explore os fóruns da comunidade", fr:"Explorez les forums de la communauté", de:"Erkunde die Community-Foren", it:"Esplora i forum della comunità", nl:"Verken de communityfora", ja:"コミュニティフォーラムを探索", zh:"探索社区论坛", ru:"Обзор форумов сообщества", ar:"استكشف منتديات المجتمع", hi:"समुदाय फ़ोरम देखें", ko:"커뮤니티 포럼 탐색", tr:"Topluluk forumlarını keşfet", pl:"Przeglądaj fora społeczności", sv:"Utforska gemenskapens forum", id:"Jelajahi forum komunitas", th:"สำรวจฟอรั่มชุมชน" },
  "Región": { en:"Region", pt:"Região", fr:"Région", de:"Region", it:"Regione", nl:"Regio", ja:"地域", zh:"地区", ru:"Регион", ar:"المنطقة", hi:"क्षेत्र", ko:"지역", tr:"Bölge", pl:"Region", sv:"Region", id:"Wilayah", th:"ภูมิภาค" },
  "País": { en:"Country", pt:"País", fr:"Pays", de:"Land", it:"Paese", nl:"Land", ja:"国", zh:"国家", ru:"Страна", ar:"البلد", hi:"देश", ko:"국가", tr:"Ülke", pl:"Kraj", sv:"Land", id:"Negara", th:"ประเทศ" },
  "Subforos": { en:"Subforums", pt:"Subfóruns", fr:"Sous-forums", de:"Unterforen", it:"Sottoforum", nl:"Subforums", ja:"サブフォーラム", zh:"子论坛", ru:"Подфорумы", ar:"المنتديات الفرعية", hi:"उप-फ़ोरम", ko:"하위 포럼", tr:"Alt forumlar", pl:"Podfora", sv:"Underforum", id:"Subforum", th:"ฟอรั่มย่อย" },
  "Responder": { en:"Reply", pt:"Responder", fr:"Répondre", de:"Antworten", it:"Rispondi", nl:"Antwoorden", ja:"返信", zh:"回复", ru:"Ответить", ar:"رد", hi:"जवाब दें", ko:"답글", tr:"Yanıtla", pl:"Odpowiedz", sv:"Svara", id:"Balas", th:"ตอบกลับ" },
  "Vistas": { en:"Views", pt:"Visualizações", fr:"Vues", de:"Ansichten", it:"Visualizzazioni", nl:"Weergaven", ja:"閲覧数", zh:"浏览量", ru:"Просмотры", ar:"مشاهدات", hi:"दृश्य", ko:"조회수", tr:"Görüntüleme", pl:"Wyświetlenia", sv:"Visningar", id:"Tampilan", th:"การดู" },
  "Respuestas": { en:"Replies", pt:"Respostas", fr:"Réponses", de:"Antworten", it:"Risposte", nl:"Antwoorden", ja:"返信", zh:"回复", ru:"Ответы", ar:"ردود", hi:"उत्तर", ko:"답글", tr:"Yanıtlar", pl:"Odpowiedzi", sv:"Svar", id:"Balasan", th:"การตอบกลับ" },
  "por": { en:"by", pt:"por", fr:"par", de:"von", it:"di", nl:"door", ja:"by", zh:"由", ru:"от", ar:"بواسطة", hi:"द्वारा", ko:"작성자", tr:"tarafından", pl:"przez", sv:"av", id:"oleh", th:"โดย" },
  "en": { en:"in", pt:"em", fr:"dans", de:"in", it:"in", nl:"in", ja:"in", zh:"在", ru:"в", ar:"في", hi:"में", ko:"에서", tr:"içinde", pl:"w", sv:"i", id:"di", th:"ใน" },
  "Publicado en": { en:"Posted in", pt:"Publicado em", fr:"Publié dans", de:"Gepostet in", it:"Pubblicato in", nl:"Geplaatst in", ja:"投稿先", zh:"发布于", ru:"Опубликовано в", ar:"نشر في", hi:"में प्रकाशित", ko:"게시 위치", tr:"Yayınlandığı yer", pl:"Opublikowano w", sv:"Postat i", id:"Diposting di", th:"โพสต์ใน" },
  "Iniciado por": { en:"Started by", pt:"Iniciado por", fr:"Créé par", de:"Erstellt von", it:"Creato da", nl:"Gestart door", ja:"作成者", zh:"发起人", ru:"Создано", ar:"بدأه", hi:"शुरू किया", ko:"작성", tr:"Başlatan", pl:"Rozpoczęty przez", sv:"Startat av", id:"Dimulai oleh", th:"เริ่มโดย" },
  "No hay hilos todavía": { en:"No threads yet", pt:"Nenhum tópico ainda", fr:"Aucun sujet pour le moment", de:"Noch keine Themen", it:"Nessuna discussione ancora", nl:"Nog geen onderwerpen", ja:"まだスレッドはありません", zh:"暂无主题", ru:"Пока нет тем", ar:"لا توجد مواضيع بعد", hi:"अभी तक कोई थ्रेड नहीं", ko:"아직 스레드가 없습니다", tr:"Henüz konu yok", pl:"Nie ma jeszcze wątków", sv:"Inga trådar ännu", id:"Belum ada thread", th:"ยังไม่มีกระทู้" },
  "Sé el primero en crear un hilo": { en:"Be the first to create a thread", pt:"Seja o primeiro a criar um tópico", fr:"Soyez le premier à créer un sujet", de:"Erstellen Sie das erste Thema", it:"Sii il primo a creare una discussione", nl:"Wees de eerste om een onderwerp te maken", ja:"最初のスレッドを作成しましょう", zh:"成为第一个创建主题的人", ru:"Будьте первым, кто создаст тему", ar:"كن أول من ينشئ موضوعاً", hi:"पहला थ्रेड बनाएं", ko:"첫 번째 스레드를 만들어보세요", tr:"İlk konuyu oluşturan siz olun", pl:"Bądź pierwszy i utwórz wątek", sv:"Var först med att skapa en tråd", id:"Jadilah yang pertama membuat thread", th:"เป็นคนแรกที่สร้างกระทู้" },
  "Volver al foro": { en:"Back to forum", pt:"Voltar ao fórum", fr:"Retour au forum", de:"Zurück zum Forum", it:"Torna al forum", nl:"Terug naar forum", ja:"フォーラムに戻る", zh:"返回论坛", ru:"Вернуться на форум", ar:"العودة إلى المنتدى", hi:"फ़ोरम पर वापस", ko:"포럼으로 돌아가기", tr:"Foruma dön", pl:"Powrót do forum", sv:"Tillbaka till forum", id:"Kembali ke forum", th:"กลับไปฟอรั่ม" },
  "Página": { en:"Page", pt:"Página", fr:"Page", de:"Seite", it:"Pagina", nl:"Pagina", ja:"ページ", zh:"页面", ru:"Страница", ar:"صفحة", hi:"पृष्ठ", ko:"페이지", tr:"Sayfa", pl:"Strona", sv:"Sida", id:"Halaman", th:"หน้า" },

  // --- AUTH ---
  "Iniciar sesión": { en:"Sign in", pt:"Entrar", fr:"Se connecter", de:"Anmelden", it:"Accedi", nl:"Inloggen", ja:"ログイン", zh:"登录", ru:"Войти", ar:"تسجيل الدخول", hi:"लॉगिन करें", ko:"로그인", tr:"Giriş yap", pl:"Zaloguj się", sv:"Logga in", id:"Masuk", th:"เข้าสู่ระบบ" },
  "Registrarse": { en:"Register", pt:"Registrar-se", fr:"S'inscrire", de:"Registrieren", it:"Registrati", nl:"Registreren", ja:"新規登録", zh:"注册", ru:"Регистрация", ar:"التسجيل", hi:"पंजीकरण", ko:"회원가입", tr:"Kayıt ol", pl:"Zarejestruj się", sv:"Registrera", id:"Daftar", th:"สมัครสมาชิก" },
  "Correo electrónico": { en:"Email", pt:"E-mail", fr:"E-mail", de:"E-Mail", it:"Email", nl:"E-mail", ja:"メール", zh:"邮箱", ru:"Электронная почта", ar:"البريد الإلكتروني", hi:"ईमेल", ko:"이메일", tr:"E-posta", pl:"E-mail", sv:"E-post", id:"Email", th:"อีเมล" },
  "Contraseña": { en:"Password", pt:"Senha", fr:"Mot de passe", de:"Passwort", it:"Password", nl:"Wachtwoord", ja:"パスワード", zh:"密码", ru:"Пароль", ar:"كلمة المرور", hi:"पासवर्ड", ko:"비밀번호", tr:"Şifre", pl:"Hasło", sv:"Lösenord", id:"Kata sandi", th:"รหัสผ่าน" },
  "Nombre de usuario": { en:"Username", pt:"Nome de usuário", fr:"Nom d'utilisateur", de:"Benutzername", it:"Nome utente", nl:"Gebruikersnaam", ja:"ユーザー名", zh:"用户名", ru:"Имя пользователя", ar:"اسم المستخدم", hi:"उपयोगकर्ता नाम", ko:"사용자 이름", tr:"Kullanıcı adı", pl:"Nazwa użytkownika", sv:"Användarnamn", id:"Nama pengguna", th:"ชื่อผู้ใช้" },
  "¿Olvidaste tu contraseña?": { en:"Forgot your password?", pt:"Esqueceu a senha?", fr:"Mot de passe oublié ?", de:"Passwort vergessen?", it:"Password dimenticata?", nl:"Wachtwoord vergeten?", ja:"パスワードを忘れましたか？", zh:"忘记密码？", ru:"Забыли пароль?", ar:"نسيت كلمة المرور؟", hi:"पासवर्ड भूल गए?", ko:"비밀번호를 잊으셨나요?", tr:"Şifrenizi mi unuttunuz?", pl:"Zapomniałeś hasła?", sv:"Glömt lösenordet?", id:"Lupa kata sandi?", th:"ลืมรหัสผ่าน?" },
  "¿No tienes cuenta?": { en:"Don't have an account?", pt:"Não tem uma conta?", fr:"Pas de compte ?", de:"Kein Konto?", it:"Non hai un account?", nl:"Geen account?", ja:"アカウントをお持ちでないですか？", zh:"没有账户？", ru:"Нет аккаунта?", ar:"ليس لديك حساب؟", hi:"खाता नहीं है?", ko:"계정이 없으신가요?", tr:"Hesabınız yok mu?", pl:"Nie masz konta?", sv:"Har du inget konto?", id:"Belum punya akun?", th:"ยังไม่มีบัญชี?" },
  "¿Ya tienes cuenta?": { en:"Already have an account?", pt:"Já tem uma conta?", fr:"Déjà un compte ?", de:"Bereits ein Konto?", it:"Hai già un account?", nl:"Al een account?", ja:"すでにアカウントをお持ちですか？", zh:"已有账户？", ru:"Уже есть аккаунт?", ar:"لديك حساب بالفعل؟", hi:"पहले से खाता है?", ko:"이미 계정이 있으신가요?", tr:"Zaten hesabınız var mı?", pl:"Masz już konto?", sv:"Har du redan ett konto?", id:"Sudah punya akun?", th:"มีบัญชีแล้ว?" },
  "Regístrate aquí": { en:"Register here", pt:"Registre-se aqui", fr:"Inscrivez-vous ici", de:"Hier registrieren", it:"Registrati qui", nl:"Registreer hier", ja:"ここで登録", zh:"在此注册", ru:"Зарегистрироваться", ar:"سجل هنا", hi:"यहाँ पंजीकरण करें", ko:"여기에서 가입", tr:"Buradan kayıt olun", pl:"Zarejestruj się tutaj", sv:"Registrera dig här", id:"Daftar di sini", th:"สมัครที่นี่" },
  "Inicia sesión aquí": { en:"Sign in here", pt:"Entre aqui", fr:"Connectez-vous ici", de:"Hier anmelden", it:"Accedi qui", nl:"Log hier in", ja:"ここでログイン", zh:"在此登录", ru:"Войти", ar:"سجل دخولك هنا", hi:"यहाँ लॉगिन करें", ko:"여기에서 로그인", tr:"Buradan giriş yapın", pl:"Zaloguj się tutaj", sv:"Logga in här", id:"Masuk di sini", th:"เข้าสู่ระบบที่นี่" },

  // --- PROFILE ---
  "Editar perfil": { en:"Edit profile", pt:"Editar perfil", fr:"Modifier le profil", de:"Profil bearbeiten", it:"Modifica profilo", nl:"Profiel bewerken", ja:"プロフィール編集", zh:"编辑个人资料", ru:"Редактировать профиль", ar:"تعديل الملف الشخصي", hi:"प्रोफ़ाइल संपादित करें", ko:"프로필 편집", tr:"Profili düzenle", pl:"Edytuj profil", sv:"Redigera profil", id:"Edit profil", th:"แก้ไขโปรไฟล์" },
  "Miembro desde": { en:"Member since", pt:"Membro desde", fr:"Membre depuis", de:"Mitglied seit", it:"Membro dal", nl:"Lid sinds", ja:"メンバー登録日", zh:"注册时间", ru:"Участник с", ar:"عضو منذ", hi:"सदस्य तब से", ko:"가입일", tr:"Üye olma tarihi", pl:"Członek od", sv:"Medlem sedan", id:"Anggota sejak", th:"สมาชิกตั้งแต่" },
  "Publicaciones": { en:"Posts", pt:"Publicações", fr:"Messages", de:"Beiträge", it:"Post", nl:"Berichten", ja:"投稿", zh:"帖子", ru:"Сообщения", ar:"المشاركات", hi:"पोस्ट", ko:"게시물", tr:"Gönderiler", pl:"Posty", sv:"Inlägg", id:"Postingan", th:"โพสต์" },
  "Visitas al perfil": { en:"Profile views", pt:"Visitas ao perfil", fr:"Vues du profil", de:"Profilaufrufe", it:"Visite al profilo", nl:"Profielweergaven", ja:"プロフィール閲覧数", zh:"个人主页浏览量", ru:"Просмотры профиля", ar:"مشاهدات الملف الشخصي", hi:"प्रोफ़ाइल दृश्य", ko:"프로필 조회수", tr:"Profil görüntüleme", pl:"Wyświetlenia profilu", sv:"Profilvisningar", id:"Tampilan profil", th:"การดูโปรไฟล์" },
  "Gracias recibidos": { en:"Thanks received", pt:"Agradecimentos recebidos", fr:"Remerciements reçus", de:"Erhaltene Danke", it:"Ringraziamenti ricevuti", nl:"Ontvangen bedankjes", ja:"受け取った感謝", zh:"收到的感谢", ru:"Полученные благодарности", ar:"شكر مستلم", hi:"प्राप्त धन्यवाद", ko:"받은 감사", tr:"Alınan teşekkürler", pl:"Otrzymane podziękowania", sv:"Mottagna tack", id:"Terima kasih diterima", th:"ได้รับความขอบคุณ" },
  "Gracias dados": { en:"Thanks given", pt:"Agradecimentos dados", fr:"Remerciements donnés", de:"Gegebene Danke", it:"Ringraziamenti dati", nl:"Gegeven bedankjes", ja:"送った感謝", zh:"发出的感谢", ru:"Отправленные благодарности", ar:"شكر مرسل", hi:"दिए गए धन्यवाद", ko:"보낸 감사", tr:"Verilen teşekkürler", pl:"Dane podziękowania", sv:"Givna tack", id:"Terima kasih diberikan", th:"ให้ความขอบคุณ" },
  "Seguidores": { en:"Followers", pt:"Seguidores", fr:"Abonnés", de:"Follower", it:"Follower", nl:"Volgers", ja:"フォロワー", zh:"关注者", ru:"Подписчики", ar:"متابعون", hi:"अनुयायी", ko:"팔로워", tr:"Takipçiler", pl:"Obserwujący", sv:"Följare", id:"Pengikut", th:"ผู้ติดตาม" },
  "Siguiendo": { en:"Following", pt:"Seguindo", fr:"Abonnements", de:"Folgt", it:"Seguiti", nl:"Volgend", ja:"フォロー中", zh:"关注中", ru:"Подписки", ar:"يتابع", hi:"फ़ॉलो कर रहे हैं", ko:"팔로잉", tr:"Takip edilen", pl:"Obserwowani", sv:"Följer", id:"Mengikuti", th:"กำลังติดตาม" },
  "Reputación": { en:"Reputation", pt:"Reputação", fr:"Réputation", de:"Reputation", it:"Reputazione", nl:"Reputatie", ja:"評判", zh:"声誉", ru:"Репутация", ar:"السمعة", hi:"प्रतिष्ठा", ko:"평판", tr:"İtibar", pl:"Reputacja", sv:"Rykte", id:"Reputasi", th:"ชื่อเสียง" },
  "Actividad reciente": { en:"Recent activity", pt:"Atividade recente", fr:"Activité récente", de:"Letzte Aktivität", it:"Attività recente", nl:"Recente activiteit", ja:"最近のアクティビティ", zh:"最近活动", ru:"Недавняя активность", ar:"نشاط حديث", hi:"हाल की गतिविधि", ko:"최근 활동", tr:"Son aktivite", pl:"Ostatnia aktywność", sv:"Senaste aktivitet", id:"Aktivitas terbaru", th:"กิจกรรมล่าสุด" },
  "Se unió el": { en:"Joined on", pt:"Entrou em", fr:"A rejoint le", de:"Beigetreten am", it:"Iscritto il", nl:"Lid geworden op", ja:"参加日", zh:"加入于", ru:"Присоединился", ar:"انضم في", hi:"शामिल हुए", ko:"가입일", tr:"Katılma tarihi", pl:"Dołączył", sv:"Gick med den", id:"Bergabung pada", th:"เข้าร่วมเมื่อ" },
  "respondió en": { en:"replied in", pt:"respondeu em", fr:"a répondu dans", de:"hat geantwortet in", it:"ha risposto in", nl:"antwoordde in", ja:"に返信しました", zh:"回复了", ru:"ответил в", ar:"رد في", hi:"में जवाब दिया", ko:"에 답글 남김", tr:"yanıtladı", pl:"odpowiedział w", sv:"svarade i", id:"membalas di", th:"ตอบกลับใน" },
  "Miembro Fundador": { en:"Founding Member", pt:"Membro Fundador", fr:"Membre Fondateur", de:"Gründungsmitglied", it:"Membro Fondatore", nl:"Oprichtend lid", ja:"設立メンバー", zh:"创始会员", ru:"Основатель", ar:"عضو مؤسس", hi:"संस्थापक सदस्य", ko:"창립 멤버", tr:"Kurucu Üye", pl:"Członek Założyciel", sv:"Grundande Medlem", id:"Anggota Pendiri", th:"สมาชิกผู้ก่อตั้ง" },

  // --- POST ACTIONS ---
  "Citar": { en:"Quote", pt:"Citar", fr:"Citer", de:"Zitieren", it:"Cita", nl:"Citeren", ja:"引用", zh:"引用", ru:"Цитата", ar:"اقتبس", hi:"उद्धरण", ko:"인용", tr:"Alıntıla", pl:"Cytuj", sv:"Citera", id:"Kutip", th:"อ้างอิง" },
  "Seguir": { en:"Follow", pt:"Seguir", fr:"Suivre", de:"Folgen", it:"Segui", nl:"Volgen", ja:"フォロー", zh:"关注", ru:"Подписаться", ar:"متابعة", hi:"फ़ॉलो करें", ko:"팔로우", tr:"Takip et", pl:"Obserwuj", sv:"Följ", id:"Ikuti", th:"ติดตาม" },
  "Dejar de seguir": { en:"Unfollow", pt:"Deixar de seguir", fr:"Ne plus suivre", de:"Entfolgen", it:"Smetti di seguire", nl:"Ontvolgen", ja:"フォロー解除", zh:"取消关注", ru:"Отписаться", ar:"إلغاء المتابعة", hi:"अनफ़ॉलो करें", ko:"팔로우 취소", tr:"Takibi bırak", pl:"Przestań obserwować", sv:"Sluta följa", id:"Berhenti mengikuti", th:"เลิกติดตาม" },
  "Enviar mensaje": { en:"Send message", pt:"Enviar mensagem", fr:"Envoyer un message", de:"Nachricht senden", it:"Invia messaggio", nl:"Bericht sturen", ja:"メッセージ送信", zh:"发送消息", ru:"Отправить сообщение", ar:"إرسال رسالة", hi:"संदेश भेजें", ko:"메시지 보내기", tr:"Mesaj gönder", pl:"Wyślij wiadomość", sv:"Skicka meddelande", id:"Kirim pesan", th:"ส่งข้อความ" },
  "Gracias": { en:"Thanks", pt:"Obrigado", fr:"Merci", de:"Danke", it:"Grazie", nl:"Bedankt", ja:"ありがとう", zh:"感谢", ru:"Спасибо", ar:"شكراً", hi:"धन्यवाद", ko:"감사", tr:"Teşekkürler", pl:"Dziękuję", sv:"Tack", id:"Terima kasih", th:"ขอบคุณ" },
  "Registro:": { en:"Joined:", pt:"Registro:", fr:"Inscription :", de:"Registriert:", it:"Registrato:", nl:"Registratie:", ja:"登録日:", zh:"注册日期:", ru:"Регистрация:", ar:"التسجيل:", hi:"पंजीकरण:", ko:"가입:", tr:"Kayıt:", pl:"Rejestracja:", sv:"Registrerad:", id:"Registrasi:", th:"สมัครเมื่อ:" },

  // --- PROFILE STATS ---
  "Reacciones": { en:"Reactions", pt:"Reações", fr:"Réactions", de:"Reaktionen", it:"Reazioni", nl:"Reacties", ja:"リアクション", zh:"反应", ru:"Реакции", ar:"تفاعلات", hi:"प्रतिक्रियाएँ", ko:"반응", tr:"Tepkiler", pl:"Reakcje", sv:"Reaktioner", id:"Reaksi", th:"ปฏิกิริยา" },

  // --- SEARCH ---
  "Buscar hilos, posts, usuarios...": { en:"Search threads, posts, users...", pt:"Buscar tópicos, posts, usuários...", fr:"Rechercher sujets, messages, utilisateurs...", de:"Themen, Beiträge, Benutzer suchen...", it:"Cerca discussioni, post, utenti...", nl:"Zoek onderwerpen, berichten, gebruikers...", ja:"スレッド、投稿、ユーザーを検索...", zh:"搜索主题、帖子、用户...", ru:"Поиск тем, сообщений, пользователей...", ar:"البحث في المواضيع، المشاركات، المستخدمين...", hi:"थ्रेड, पोस्ट, उपयोगकर्ता खोजें...", ko:"스레드, 게시물, 사용자 검색...", tr:"Konu, gönderi, kullanıcı ara...", pl:"Szukaj wątków, postów, użytkowników...", sv:"Sök trådar, inlägg, användare...", id:"Cari thread, postingan, pengguna...", th:"ค้นหากระทู้ โพสต์ ผู้ใช้..." },
  "Todo": { en:"All", pt:"Tudo", fr:"Tout", de:"Alles", it:"Tutto", nl:"Alles", ja:"すべて", zh:"全部", ru:"Всё", ar:"الكل", hi:"सभी", ko:"전체", tr:"Tümü", pl:"Wszystko", sv:"Allt", id:"Semua", th:"ทั้งหมด" },
  "Usuarios": { en:"Users", pt:"Usuários", fr:"Utilisateurs", de:"Benutzer", it:"Utenti", nl:"Gebruikers", ja:"ユーザー", zh:"用户", ru:"Пользователи", ar:"المستخدمون", hi:"उपयोगकर्ता", ko:"사용자", tr:"Kullanıcılar", pl:"Użytkownicy", sv:"Användare", id:"Pengguna", th:"ผู้ใช้" },
  "No se encontraron resultados": { en:"No results found", pt:"Nenhum resultado encontrado", fr:"Aucun résultat trouvé", de:"Keine Ergebnisse gefunden", it:"Nessun risultato trovato", nl:"Geen resultaten gevonden", ja:"結果が見つかりません", zh:"未找到结果", ru:"Результаты не найдены", ar:"لم يتم العثور على نتائج", hi:"कोई परिणाम नहीं मिला", ko:"결과를 찾을 수 없습니다", tr:"Sonuç bulunamadı", pl:"Nie znaleziono wyników", sv:"Inga resultat hittades", id:"Tidak ada hasil ditemukan", th:"ไม่พบผลลัพธ์" },
  "Buscando...": { en:"Searching...", pt:"Buscando...", fr:"Recherche...", de:"Suche...", it:"Ricerca...", nl:"Zoeken...", ja:"検索中...", zh:"搜索中...", ru:"Поиск...", ar:"جاري البحث...", hi:"खोज रहे हैं...", ko:"검색 중...", tr:"Aranıyor...", pl:"Szukanie...", sv:"Söker...", id:"Mencari...", th:"กำลังค้นหา..." },

  // --- ROLES ---
  "roleAdmin": { en:"Admin", pt:"Admin", fr:"Admin", de:"Admin", it:"Admin", nl:"Admin", ja:"管理者", zh:"管理员", ru:"Админ", ar:"مشرف", hi:"एडमिन", ko:"관리자", tr:"Yönetici", pl:"Admin", sv:"Admin", id:"Admin", th:"แอดมิน" },
  "roleMod": { en:"Mod", pt:"Mod", fr:"Mod", de:"Mod", it:"Mod", nl:"Mod", ja:"モデレーター", zh:"版主", ru:"Модератор", ar:"مشرف", hi:"मॉड", ko:"모더", tr:"Moderatör", pl:"Mod", sv:"Mod", id:"Mod", th:"มอด" },
  "roleVip": { en:"VIP", pt:"VIP", fr:"VIP", de:"VIP", it:"VIP", nl:"VIP", ja:"VIP", zh:"VIP", ru:"VIP", ar:"VIP", hi:"VIP", ko:"VIP", tr:"VIP", pl:"VIP", sv:"VIP", id:"VIP", th:"VIP" },
  "roleVerified": { en:"Verified", pt:"Verificada", fr:"Vérifiée", de:"Verifiziert", it:"Verificata", nl:"Geverifieerd", ja:"認証済み", zh:"已验证", ru:"Подтверждена", ar:"موثقة", hi:"सत्यापित", ko:"인증됨", tr:"Doğrulanmış", pl:"Zweryfikowana", sv:"Verifierad", id:"Terverifikasi", th:"ยืนยันแล้ว" },
  "rolePremium": { en:"Premium", pt:"Premium", fr:"Premium", de:"Premium", it:"Premium", nl:"Premium", ja:"プレミアム", zh:"高级", ru:"Премиум", ar:"مميز", hi:"प्रीमियम", ko:"프리미엄", tr:"Premium", pl:"Premium", sv:"Premium", id:"Premium", th:"พรีเมียม" },
  "roleUser": { en:"User", pt:"Usuária", fr:"Utilisatrice", de:"Benutzerin", it:"Utente", nl:"Gebruiker", ja:"ユーザー", zh:"用户", ru:"Пользователь", ar:"مستخدم", hi:"उपयोगकर्ता", ko:"사용자", tr:"Kullanıcı", pl:"Użytkownik", sv:"Användare", id:"Pengguna", th:"ผู้ใช้" },

  // --- THREAD ---
  "Crear nuevo hilo": { en:"Create new thread", pt:"Criar novo tópico", fr:"Créer un nouveau sujet", de:"Neues Thema erstellen", it:"Crea nuova discussione", nl:"Nieuw onderwerp maken", ja:"新しいスレッドを作成", zh:"创建新主题", ru:"Создать новую тему", ar:"إنشاء موضوع جديد", hi:"नया थ्रेड बनाएं", ko:"새 스레드 만들기", tr:"Yeni konu oluştur", pl:"Utwórz nowy wątek", sv:"Skapa ny tråd", id:"Buat thread baru", th:"สร้างกระทู้ใหม่" },
  "Título": { en:"Title", pt:"Título", fr:"Titre", de:"Titel", it:"Titolo", nl:"Titel", ja:"タイトル", zh:"标题", ru:"Заголовок", ar:"العنوان", hi:"शीर्षक", ko:"제목", tr:"Başlık", pl:"Tytuł", sv:"Titel", id:"Judul", th:"หัวข้อ" },
  "Contenido": { en:"Content", pt:"Conteúdo", fr:"Contenu", de:"Inhalt", it:"Contenuto", nl:"Inhoud", ja:"内容", zh:"内容", ru:"Содержание", ar:"المحتوى", hi:"सामग्री", ko:"내용", tr:"İçerik", pl:"Treść", sv:"Innehåll", id:"Konten", th:"เนื้อหา" },
  "Publicar hilo": { en:"Post thread", pt:"Publicar tópico", fr:"Publier le sujet", de:"Thema veröffentlichen", it:"Pubblica discussione", nl:"Onderwerp plaatsen", ja:"スレッドを投稿", zh:"发布主题", ru:"Опубликовать тему", ar:"نشر الموضوع", hi:"थ्रेड प्रकाशित करें", ko:"스레드 게시", tr:"Konuyu yayınla", pl:"Opublikuj wątek", sv:"Posta tråd", id:"Posting thread", th:"โพสต์กระทู้" },
  "Fijado": { en:"Pinned", pt:"Fixado", fr:"Épinglé", de:"Angepinnt", it:"Fissato", nl:"Vastgepind", ja:"固定済み", zh:"置顶", ru:"Закреплено", ar:"مثبت", hi:"पिन किया हुआ", ko:"고정됨", tr:"Sabitlenmiş", pl:"Przypięty", sv:"Fäst", id:"Disematkan", th:"ปักหมุด" },
  "Cerrado": { en:"Closed", pt:"Fechado", fr:"Fermé", de:"Geschlossen", it:"Chiuso", nl:"Gesloten", ja:"クローズ", zh:"已关闭", ru:"Закрыто", ar:"مغلق", hi:"बंद", ko:"닫힘", tr:"Kapalı", pl:"Zamknięty", sv:"Stängd", id:"Ditutup", th:"ปิด" },
  "hace": { en:"ago", pt:"atrás", fr:"il y a", de:"vor", it:"fa", nl:"geleden", ja:"前", zh:"前", ru:"назад", ar:"منذ", hi:"पहले", ko:"전", tr:"önce", pl:"temu", sv:"sedan", id:"yang lalu", th:"ที่แล้ว" },

  // --- HOME ---
  "La comunidad #1 de ratings y reseñas de escorts trans. Comparte tu experiencia, descubre las mejor valoradas y conecta con otros catadores probadores en tu ciudad.": {
    en:"The #1 community for trans escort ratings and reviews. Share your experience, discover the top rated and connect with other reviewers in your city.",
    pt:"A comunidade #1 de avaliações e resenhas de acompanhantes trans. Compartilhe sua experiência, descubra as mais bem avaliadas e conecte-se com outros avaliadores em sua cidade.",
    fr:"La communauté #1 de notes et avis sur les escorts trans. Partagez votre expérience, découvrez les mieux notées et connectez-vous avec d'autres connaisseurs dans votre ville.",
    de:"Die #1 Community für Bewertungen und Rezensionen von Trans-Escorts. Teilen Sie Ihre Erfahrung, entdecken Sie die bestbewerteten und verbinden Sie sich mit anderen Kennern in Ihrer Stadt.",
    it:"La community #1 per valutazioni e recensioni di escort trans. Condividi la tua esperienza, scopri le più votate e connettiti con altri conoscitori nella tua città.",
    nl:"De #1 community voor beoordelingen en recensies van trans escorts. Deel je ervaring, ontdek de best beoordeelde en maak contact met andere kenners in jouw stad.",
    ja:"トランスエスコートの評価とレビューの#1コミュニティ。あなたの経験を共有し、最高評価を発見し、あなたの街の他のレビュアーとつながりましょう。",
    zh:"排名第一的跨性别伴游评分和评论社区。分享您的经验，发现最高评分，并与您所在城市的其他评论者建立联系。",
    ru:"Сообщество №1 по рейтингам и отзывам транс-эскортов. Поделитесь опытом, найдите лучших и свяжитесь с другими знатоками в вашем городе.",
    ar:"المجتمع رقم 1 لتقييمات ومراجعات مرافقات الترانس. شارك تجربتك، اكتشف الأعلى تقييماً وتواصل مع المراجعين الآخرين في مدينتك.",
    hi:"ट्रांस एस्कॉर्ट रेटिंग और समीक्षा का #1 समुदाय। अपना अनुभव साझा करें, सर्वोच्च रेटेड खोजें और अपने शहर के अन्य समीक्षकों से जुड़ें।",
    ko:"트랜스 에스코트 평점 및 리뷰 #1 커뮤니티. 경험을 공유하고, 최고 평점을 발견하고, 도시의 다른 리뷰어와 연결하세요.",
    tr:"Trans eskort derecelendirme ve yorumlarının 1 numaralı topluluğu. Deneyiminizi paylaşın, en yüksek puanlıları keşfedin ve şehrinizdeki diğer yorumcularla bağlantı kurun.",
    pl:"Społeczność #1 w zakresie ocen i recenzji trans eskortek. Podziel się doświadczeniem, odkryj najwyżej oceniane i połącz się z innymi recenzentami w swoim mieście.",
    sv:"Det #1 communityt för betyg och recensioner av trans-eskorter. Dela din erfarenhet, upptäck de högst betygsatta och anslut med andra recensenter i din stad.",
    id:"Komunitas #1 untuk penilaian dan ulasan escort trans. Bagikan pengalaman Anda, temukan yang tertinggi dinilai dan terhubung dengan pengulas lain di kota Anda.",
    th:"ชุมชนอันดับ 1 สำหรับเรตติ้งและรีวิวเอสคอร์ตทรานส์ แชร์ประสบการณ์ของคุณ ค้นพบที่ได้รับเรตติ้งสูงสุดและเชื่อมต่อกับรีวิวเวอร์คนอื่นในเมืองของคุณ"
  },

  // --- NOTIFICATIONS ---
  "Notificaciones": { en:"Notifications", pt:"Notificações", fr:"Notifications", de:"Benachrichtigungen", it:"Notifiche", nl:"Meldingen", ja:"通知", zh:"通知", ru:"Уведомления", ar:"الإشعارات", hi:"सूचनाएँ", ko:"알림", tr:"Bildirimler", pl:"Powiadomienia", sv:"Aviseringar", id:"Notifikasi", th:"การแจ้งเตือน" },
  "Marcar todas como leídas": { en:"Mark all as read", pt:"Marcar todas como lidas", fr:"Tout marquer comme lu", de:"Alle als gelesen markieren", it:"Segna tutto come letto", nl:"Alles als gelezen markeren", ja:"すべて既読にする", zh:"全部标记为已读", ru:"Отметить всё как прочитанное", ar:"تحديد الكل كمقروء", hi:"सभी को पढ़ा हुआ चिह्नित करें", ko:"모두 읽음으로 표시", tr:"Tümünü okundu işaretle", pl:"Oznacz wszystkie jako przeczytane", sv:"Markera alla som lästa", id:"Tandai semua dibaca", th:"ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว" },
  "No tienes notificaciones": { en:"You have no notifications", pt:"Você não tem notificações", fr:"Vous n'avez pas de notifications", de:"Keine Benachrichtigungen", it:"Non hai notifiche", nl:"Geen meldingen", ja:"通知はありません", zh:"没有通知", ru:"Нет уведомлений", ar:"لا توجد إشعارات", hi:"कोई सूचना नहीं", ko:"알림이 없습니다", tr:"Bildiriminiz yok", pl:"Nie masz powiadomień", sv:"Inga aviseringar", id:"Tidak ada notifikasi", th:"ไม่มีการแจ้งเตือน" },
  "Ver todas las notificaciones": { en:"View all notifications", pt:"Ver todas as notificações", fr:"Voir toutes les notifications", de:"Alle Benachrichtigungen anzeigen", it:"Vedi tutte le notifiche", nl:"Alle meldingen bekijken", ja:"すべての通知を見る", zh:"查看所有通知", ru:"Все уведомления", ar:"عرض كل الإشعارات", hi:"सभी सूचनाएँ देखें", ko:"모든 알림 보기", tr:"Tüm bildirimleri gör", pl:"Zobacz wszystkie powiadomienia", sv:"Visa alla aviseringar", id:"Lihat semua notifikasi", th:"ดูการแจ้งเตือนทั้งหมด" },

  // --- ONLINE STATUS ---
  "En línea": { en:"Online", pt:"Online", fr:"En ligne", de:"Online", it:"Online", nl:"Online", ja:"オンライン", zh:"在线", ru:"Онлайн", ar:"متصل", hi:"ऑनलाइन", ko:"온라인", tr:"Çevrimiçi", pl:"Online", sv:"Online", id:"Online", th:"ออนไลน์" },
  "Desconectado": { en:"Offline", pt:"Offline", fr:"Hors ligne", de:"Offline", it:"Offline", nl:"Offline", ja:"オフライン", zh:"离线", ru:"Не в сети", ar:"غير متصل", hi:"ऑफ़लाइन", ko:"오프라인", tr:"Çevrimdışı", pl:"Offline", sv:"Offline", id:"Offline", th:"ออฟไลน์" },
  "Visto por última vez": { en:"Last seen", pt:"Visto pela última vez", fr:"Vu pour la dernière fois", de:"Zuletzt gesehen", it:"Ultimo accesso", nl:"Laatst gezien", ja:"最終確認", zh:"最后在线", ru:"Последний раз был", ar:"شوهد آخر مرة", hi:"अंतिम बार देखा गया", ko:"마지막 접속", tr:"Son görülme", pl:"Ostatnio widziany", sv:"Senast sedd", id:"Terakhir dilihat", th:"เห็นล่าสุด" },
  "Hace un momento": { en:"Just now", pt:"Agora mesmo", fr:"À l'instant", de:"Gerade eben", it:"Proprio ora", nl:"Zojuist", ja:"たった今", zh:"刚刚", ru:"Только что", ar:"منذ لحظات", hi:"अभी-अभी", ko:"방금", tr:"Az önce", pl:"Przed chwilą", sv:"Just nu", id:"Baru saja", th:"เมื่อสักครู่" },
};


// ============================================================
// APPLY TRANSLATIONS
// ============================================================

const targetLangs = ['en','pt','fr','de','it','nl','ja','zh','ru','ar','hi','ko','tr','pl','sv','id','th'];

for (const lang of targetLangs) {
  const filePath = path.join(messagesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const dataFlat = flatten(data);
  let changed = 0;

  for (const key in esFlat) {
    const esValue = esFlat[key];
    const currentValue = dataFlat[key];

    // Only replace if untranslated (matches Spanish) or missing
    if (currentValue === undefined || currentValue === esValue) {
      // Look up translation
      const t = T[esValue];
      if (t && t[lang]) {
        dataFlat[key] = t[lang];
        changed++;
      }
    }
  }

  if (changed > 0) {
    const result = unflatten(dataFlat);
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.log(`${lang.toUpperCase()}: Applied ${changed} translations`);
  } else {
    console.log(`${lang.toUpperCase()}: No changes needed from this batch`);
  }
}

console.log('\nDone! Run the audit again to check remaining untranslated keys.');
