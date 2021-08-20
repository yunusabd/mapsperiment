<template>
  <div id="drag-drop-area" />
</template>

<script>
import Uppy from '@uppy/core'
import Dashboard from '@uppy/dashboard'
import exifr from 'exifr'
import '@uppy/core/dist/style.css'
import '@uppy/dashboard/dist/style.css'
export default {
  name: 'Uppy',
  data () {
    return {
      dimensions: false,
      uppy: null,
      items: [],
      modelPath:
        'https://traveldays-test.s3.eu-central-1.amazonaws.com/models/emoji_model_uint16/model.json',
      model: null
    }
  },
  mounted () {
    this.uppy = Uppy({
      autoProceed: false,
      restrictions: {
        maxFileSize: 15728640, // 15 MB
        maxNumberOfFiles: 30,
        minNumberOfFiles: 5,
        hideUploadButton: true,
        allowedFileTypes: ['image/*']
      }
    })
      .use(Dashboard, {
        inline: true,
        target: '#drag-drop-area',
        maxHeight: 300,
        thumbnailWidth: 600,
        hideUploadButton: true
      })
    this.uppy.on('thumbnail:generated', async (file, preview) => {
      // parse exif
      if (!preview) return
      const el = {}
      el.coordinates = []
      el.location = ''
      el.preview = preview
      el.thumb = preview
      el.photo = preview
      el.filename = file.filename
      el.likes = 1
      el.changed = true
      el.date = new Date(file.data.lastModified || Date.now())
      await exifr
        .parse(file.data)
        .then(async (exif) => {
          console.log(exif)
          if (exif && exif.latitude && exif.longitude) {
            el.coordinates = [exif.latitude, exif.longitude]
          } else {
            console.log('no coordinates found!')
            // use current location?
          }
          if (exif && exif.CreateDate) {
            el.date = new Date(exif.CreateDate)
          }
          if (
            exif &&
            (exif.ImageWidth || exif.ExifImageWidth) &&
            (exif.ImageHeight || exif.ExifImageHeight)
          ) {
            el.imageDimensions = [
              exif.ImageWidth || exif.ExifImageWidth,
              exif.ImageHeight || exif.ExifImageHeight
            ]
          }
        })
        .catch((error) => console.log(error))
      const img = document.createElement('img')
      img.src = preview
      img.width = 200
      if (!el.imageDimensions) {
        el.imageDimensions = await this.getDimensions(file)
      }
      el.fileID = file.id
      this.$emit('fileAdded', el)
    })
    this.uppy.on('file-removed', (file) => {
      this.$emit('fileRemoved', file)
    })
  },
  methods: {
    getImage (imgBlob) {
      const img = document.createElement('img')
      img.src = imgBlob
      img.width = 224
      img.height = 224
      return new Promise((resolve) => {
        img.onload = () => resolve(img)
      })
    },
    getDimensions (file) {
      var url = URL.createObjectURL(file.data)
      var img = new Image()
      return new Promise((resolve) => {
        img.onload = () => resolve([img.width, img.height])
        img.src = url
      })
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.uppy-Dashboard-inner {
  min-height: auto !important;
  max-width: auto !important;
  max-height: inherit !important;
}
.uppy-inner {
  margin: 1em;
}
</style>
