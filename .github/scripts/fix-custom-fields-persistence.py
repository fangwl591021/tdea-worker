from pathlib import Path

p = Path('public/app.js')
s = p.read_text(encoding='utf-8')
old = '''        Object.assign(state.data.formSettings[activity.id], {
          detailText: activity.detailText || "",
          posterUrl: activity.posterUrl || activity.imageUrl || "",
          imageUrl: activity.imageUrl || activity.posterUrl || "",
          galleryUrls: cleanUrlList(activity.galleryUrls),
          formUrl: activity.formUrl || "",
          nativeFormUrl: activity.nativeFormUrl || "",
          nativeFormId: activity.nativeFormId || "",
          formMode: activity.formMode || ""
        });'''
new = '''        Object.assign(state.data.formSettings[activity.id], {
          fields: Array.isArray(registrationSettings?.fields) ? registrationSettings.fields : [],
          detailText: activity.detailText || "",
          posterUrl: activity.posterUrl || activity.imageUrl || "",
          imageUrl: activity.imageUrl || activity.posterUrl || "",
          galleryUrls: cleanUrlList(activity.galleryUrls),
          formUrl: activity.formUrl || "",
          nativeFormUrl: activity.nativeFormUrl || "",
          nativeFormId: activity.nativeFormId || "",
          formMode: activity.formMode || ""
        });'''
if old not in s:
    raise SystemExit('target block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
