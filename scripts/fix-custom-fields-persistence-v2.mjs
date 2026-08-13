import fs from 'node:fs';

const path = 'public/app.js';
let s = fs.readFileSync(path, 'utf8');

const replacements = [
  [
`  function storedFormSettingsForActivity(activity = {}) {
    const settings = state.data.formSettings || {};
    return settings[activity.id] || settings[activity.activityNo] || {};
  }`,
`  function storedFormSettingsForActivity(activity = {}) {
    const settings = state.data.formSettings || {};
    return settings[activity.id] || settings[activity.activityNo] || activity.formSettings || {};
  }`
  ],
  [
`        try {
          const defaults = nativeFormSettingsFor(activity);
          const customFields = parseCustomRegistrationFields(d.customRegistrationFields || "");
          const registrationSettings = { ...(form.__tdeaRegistrationSettings || {}), fields: [...(Array.isArray(defaults.fields) ? defaults.fields : []), ...customFields] };`,
`        let registrationSettings = null;
        try {
          const defaults = nativeFormSettingsFor(activity);
          const customFields = parseCustomRegistrationFields(d.customRegistrationFields || "");
          registrationSettings = { ...(form.__tdeaRegistrationSettings || {}), fields: [...(Array.isArray(defaults.fields) ? defaults.fields : []), ...customFields] };`
  ],
  [
`        try {
          const saved = await saveActivityRemote(activity);`,
`        try {
          await saveManagerDataRemoteChecked();
          const saved = await saveActivityRemote(activity);`
  ]
];

for (const [oldText, newText] of replacements) {
  if (!s.includes(oldText)) {
    console.error('Expected block not found:\n' + oldText);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
}

fs.writeFileSync(path, s, 'utf8');
