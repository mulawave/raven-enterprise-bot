-- Add Firebase config keys to SystemConfig
-- FCM_SERVICE_ACCOUNT_JSON is the server-side private key (secret)
-- FCM_CLIENT_* are the browser/client SDK values (not secret — designed to be public)

INSERT INTO "SystemConfig" ("id", "key", "value", "description", "group", "is_secret", "updated_at") VALUES
  (gen_random_uuid(), 'FCM_SERVICE_ACCOUNT_JSON',        NULL, 'Firebase service account JSON (server-side). Paste the full JSON from Firebase Console → Project Settings → Service Accounts → Generate new private key.', 'firebase', true,  NOW()),
  (gen_random_uuid(), 'FCM_CLIENT_API_KEY',              NULL, 'Firebase Web API Key. Found in Firebase Console → Project Settings → General → Your apps → Web app → SDK snippet.', 'firebase', false, NOW()),
  (gen_random_uuid(), 'FCM_CLIENT_AUTH_DOMAIN',          NULL, 'Firebase Auth Domain (e.g. your-project.firebaseapp.com).', 'firebase', false, NOW()),
  (gen_random_uuid(), 'FCM_CLIENT_PROJECT_ID',           NULL, 'Firebase Project ID.', 'firebase', false, NOW()),
  (gen_random_uuid(), 'FCM_CLIENT_MESSAGING_SENDER_ID',  NULL, 'Firebase Cloud Messaging Sender ID. Found in Firebase Console → Project Settings → Cloud Messaging.', 'firebase', false, NOW()),
  (gen_random_uuid(), 'FCM_CLIENT_APP_ID',               NULL, 'Firebase Web App ID (e.g. 1:123456:web:abcdef).', 'firebase', false, NOW()),
  (gen_random_uuid(), 'FCM_CLIENT_VAPID_KEY',            NULL, 'VAPID key for Web Push. Generated in Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair.', 'firebase', false, NOW())
ON CONFLICT (key) DO NOTHING;
