export function getSafeFileName(file: File): string {
  // Extract the file extension
  const ext = file.name.substring(file.name.lastIndexOf(".")) || ""

  // Remove extension temporarily to clean only the base name
  const baseName = file.name.replace(/\.[^/.]+$/, "")

  // Replace all unsafe characters (anything not alphanumeric, dash, underscore, or dot)
  const sanitizedBase = baseName.replace(/[^\w\-]/g, "_")

  // Generate a unique, sanitized filename
  const uniqueId = crypto.randomUUID()

  // Return combined path-safe name
  return `${uniqueId}-${sanitizedBase}${ext}`
}
