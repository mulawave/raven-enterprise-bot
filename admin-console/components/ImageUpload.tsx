'use client'

import Image from 'next/image'
import { useEffect, useState, useRef, DragEvent } from 'react'
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '@/lib/constants'
import { getAdminToken } from '@/lib/auth'
import AuthenticatedImage from '@/components/AuthenticatedImage'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string) => void
  endpoint: string
  label: string
  accept?: string
  maxSize?: number
  className?: string
}

export default function ImageUpload({
  value,
  onChange,
  endpoint,
  label,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = '',
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreviewFailed(false)
  }, [value])

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    setError(null)
    setUploadSuccess(false)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0)
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percentComplete)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText)
          const uploadedUrl = response.url || response.logo_url || response.favicon_url || response.avatar_url
          
          if (uploadedUrl) {
            onChange(uploadedUrl)
            setUploadSuccess(true)
            setTimeout(() => setUploadSuccess(false), 3000)
          } else {
            setError('Upload failed: No URL returned')
          }
        } else {
          setError(`Upload failed: ${xhr.statusText}`)
        }
        setIsUploading(false)
        setUploadProgress(0)
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        setError('Upload failed: Network error')
        setIsUploading(false)
        setUploadProgress(0)
      })

      xhr.addEventListener('abort', () => {
        setError('Upload cancelled')
        setIsUploading(false)
        setUploadProgress(0)
      })

      // Get token from localStorage
      const token = getAdminToken()

      xhr.open('POST', `${API_BASE_URL}${endpoint}`, true)
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }
      xhr.send(formData)
    } catch (err) {
      setError('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemove = () => {
    onChange('')
    setUploadProgress(0)
    setUploadSuccess(false)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isProtectedPreview = !!value && value.startsWith('/uploads/avatars/')

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-300">{label}</label>

      {/* Preview or Upload Zone */}
      {value && !isUploading && !previewFailed ? (
        <div className="relative inline-block">
          {isProtectedPreview ? (
            <AuthenticatedImage
              src={`${API_BASE_URL}${value}`}
              alt={label}
              className="max-w-xs max-h-40 rounded-lg border border-gray-700 object-contain bg-gray-800"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <Image
              src={`${API_BASE_URL}${value}`}
              alt={label}
              width={320}
              height={160}
              unoptimized
              className="max-w-xs max-h-40 rounded-lg border border-gray-700 object-contain bg-gray-800"
              onError={() => setPreviewFailed(true)}
            />
          )}
          <button
            onClick={handleRemove}
            type="button"
            className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'}
            ${isUploading ? 'cursor-not-allowed opacity-75' : 'hover:bg-gray-800/70'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400">Uploading... {uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-300 mb-1">
                {isDragging ? 'Drop image here' : 'Drag & drop image here, or click to select'}
              </p>
              <p className="text-xs text-gray-500">
                Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 text-green-500 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>Upload successful!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
