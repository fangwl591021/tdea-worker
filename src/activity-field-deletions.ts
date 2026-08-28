type Row = Record<string, any>;

const clean = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);

export function removeDeletedFields(fields: Row[], deletedFields: unknown) {
  const deleted = Array.isArray(deletedFields)
    ? deletedFields.filter((item): item is Row => Boolean(item) && typeof item === "object")
    : [];
  if (!deleted.length) return fields;
  return fields.filter((field) => !deleted.some((item) => {
    const deletedKey = clean(item.key, 160);
    const deletedLabel = clean(item.label, 300).toLowerCase().replace(/\s+/g, " ");
    const fieldKey = clean(field.key, 160);
    const fieldLabel = clean(field.label, 300).toLowerCase().replace(/\s+/g, " ");
    return Boolean((deletedKey && deletedKey === fieldKey) || (deletedLabel && deletedLabel === fieldLabel));
  }));
}

export function removeDeletedOptions(fields: Row[], deletedOptions: unknown) {
  const deleted = Array.isArray(deletedOptions)
    ? deletedOptions.filter((item): item is Row => Boolean(item) && typeof item === "object")
    : [];
  if (!deleted.length) return fields;
  return fields.map((field) => {
    const matches = deleted.filter((item) => {
      const deletedKey = clean(item.fieldKey, 160);
      const deletedLabel = clean(item.fieldLabel, 300).toLowerCase().replace(/\s+/g, " ");
      const fieldKey = clean(field.key, 160);
      const fieldLabel = clean(field.label, 300).toLowerCase().replace(/\s+/g, " ");
      return Boolean((deletedKey && deletedKey === fieldKey) || (deletedLabel && deletedLabel === fieldLabel));
    });
    if (!matches.length) return field;
    const removedValues = new Set(matches.map((item) => clean(item.option, 300)).filter(Boolean));
    const options = Array.isArray(field.options)
      ? field.options.filter((value: unknown) => !removedValues.has(clean(value, 300)))
      : [];
    return { ...field, options };
  });
}
