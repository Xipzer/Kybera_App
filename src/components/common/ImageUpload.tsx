import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  currentImage: string | null
  onImageChange: (dataUrl: string | null) => void
  label: string
  description?: string
  maxSizeInMB?: number
  aspectRatio?: 'square' | 'rectangle' | 'any'
}

export function ImageUpload({ 
  currentImage, 
  onImageChange, 
  label,
  description,
  maxSizeInMB = 5,
  aspectRatio = 'any'
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (file: File) => {
    setError(null)

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Check file size
    const maxSize = maxSizeInMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File size must be less than ${maxSizeInMB}MB`)
      return
    }

    // Read and convert to data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      
      // Optional: Validate aspect ratio
      if (aspectRatio !== 'any') {
        const img = new Image()
        img.onload = () => {
          const ratio = img.width / img.height
          const isSquare = Math.abs(ratio - 1) < 0.1
          
          if (aspectRatio === 'square' && !isSquare) {
            setError('Please select a square image')
            return
          }
          
          onImageChange(result)
        }
        img.src = result
      } else {
        onImageChange(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">
        {label}
      </label>
      
      {description && (
        <p className="text-xs text-text-tertiary mb-2">{description}</p>
      )}

      <div className="space-y-2">
        {currentImage ? (
          <div className="relative inline-block">
            <img 
              src={currentImage} 
              alt={label}
              className="w-32 h-32 object-cover rounded-lg border border-border-subtle"
            />
            <button
              onClick={() => onImageChange(null)}
              className="absolute -top-2 -right-2 p-1 bg-accent text-white rounded-full hover:bg-accent-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging 
                ? 'border-accent bg-accent/10' 
                : 'border-border-default hover:border-accent/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileSelect(file)
                }
              }}
              className="hidden"
            />
            
            <ImageIcon className="w-12 h-12 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-secondary mb-2">
              Drag and drop an image here, or
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-border-default rounded-lg hover:bg-surface-hover transition-colors text-sm text-text-primary"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
            <p className="text-xs text-text-tertiary mt-2">
              Max {maxSizeInMB}MB, {aspectRatio === 'square' ? 'square images only' : 'any aspect ratio'}
            </p>
          </div>
        )}
        
        {error && (
          <p className="text-xs text-accent">{error}</p>
        )}
      </div>
    </div>
  )
}