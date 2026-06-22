/* ============================================================
   EXEMPLO de configuração do Firebase.

   COMO USAR:
   1. Copie este arquivo e renomeie a cópia para  config.js
   2. Substitua os valores abaixo pelas chaves do SEU projeto
      (Firebase Console -> Configurações do projeto -> Seus apps -> SDK).
   3. config.js NÃO é versionado (está no .gitignore).

   Observação: estas chaves do Firebase Web são públicas por
   natureza. A segurança real vem das Regras do Firestore
   (veja firestore.rules) + Firebase Authentication.
   ============================================================ */

window.firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx",
};
