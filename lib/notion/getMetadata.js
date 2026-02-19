const getDataValue = (obj) => {
  if (!obj) return null
  let res = obj
  // Aggressively unwrap 'value' layers (some API versions/responses nest them twice)
  if (res.value) res = res.value
  if (res.value) res = res.value
  return res
}

export default function getMetadata(rawMetadata) {
  const b = getDataValue(rawMetadata)
  const metadata = {
    locked: b?.format?.block_locked,
    page_full_width: b?.format?.page_full_width,
    page_font: b?.format?.page_font,
    page_small_text: b?.format?.page_small_text,
    created_time: b?.created_time,
    last_edited_time: b?.last_edited_time
  }
  return metadata
}
