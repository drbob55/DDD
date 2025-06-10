export const normalizeFilePath = (path: string): string => {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/')
}

export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.')
  return parts[parts.length - 1].toLowerCase()
}

export const isImageFile = (filename: string): boolean => {
  const ext = getFileExtension(filename)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

export const is3DFile = (filename: string): boolean => {
  const ext = getFileExtension(filename)
  return ['stl', 'obj', 'ply'].includes(ext)
}
