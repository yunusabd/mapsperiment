<template>
  <div class="beige">
    <Uppy @fileAdded="fileAdded" />
    <button style="padding: 1em; margin: 1em;" @click="start">Start</button>
    <div id="three"></div>
  </div>
</template>

<script>
// @ is an alias to /src
import Uppy from '@/components/Uppy'
import * as THREE from 'three'
import CameraControls from 'camera-controls'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import mapshaper from 'mapshaper'

export default {
  name: 'Home',
  components: {
    Uppy
  },
  data () {
    return {
      items: [],
      tripOwner: '',
      showAdmin: false,
      tripData: null,
      likes: [],
      camera: null,
      scene: null,
      renderer: null,
      animate: null,
      svg: null
    }
  },
  mounted () {
    CameraControls.install({ THREE: THREE })
    this.init()
  },
  methods: {
    fileAdded (item) {
      this.items.push(item)
    },
    start (e) {
      // filter coordinates
      this.coordinates = this.items.map(el => el.coordinates)
      const xMax = Math.max(...this.coordinates.map(o => o[1]))
      const yMax = Math.max(...this.coordinates.map(o => o[0]))
      const xMin = Math.min(...this.coordinates.map(o => o[1]))
      const yMin = Math.min(...this.coordinates.map(o => o[0]))
      const url = 'https://traveldays-test.s3.eu-central-1.amazonaws.com/ne_10m_admin_1_states_provinces.shp'
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(t => {
          const cmd = `-i ne_10m_admin_1_states_provinces.shp -clip bbox=${xMin - 1},${yMin -
            1},${xMax + 1},${yMax + 1} -o output.svg`
          const input = { 'ne_10m_admin_1_states_provinces.shp': t }
          mapshaper.applyCommands(cmd, input, (err, output) => {
            if (err) {
              console.error(err)
              return
            }
            this.svg = output['output.svg']
            console.log('success', this.svg)
            this.svgCreated()
          })
        })
        .catch(e => console.log(e))
    },
    init () {
      this.scene = new THREE.Scene()
      const clock = new THREE.Clock()
      this.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1500
      )
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      // this.renderer.shadowMap.enabled = true // Shadow map enabled
      // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      document.querySelector('#three').appendChild(this.renderer.domElement)
      this.camera.position.set(0, 50, 75)
      this.cameraControls = new CameraControls(this.camera, this.renderer.domElement)
      // this.cameraControls.mouseButtons.left = CameraControls.ACTION.TRUCK
      this.cameraControls.mouseButtons.wheel = CameraControls.ACTION.DOLLY
      // this.cameraControls.touches.one = CameraControls.ACTION.TOUCH_TRUCK
      this.cameraControls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK
      this.cameraControls.dampingFactor = 0.05
      // this.cameraControls.maxDistance = 10
      this.cameraControls.infinityDolly = true

      const bg = 'https://traveldays-test.s3.eu-central-1.amazonaws.com/1017/checkerboard.jpg'
      const tLoader = new THREE.TextureLoader()
      const groundTexture = tLoader.load(bg)
      groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping
      groundTexture.repeat.set(250, 250)
      groundTexture.anisotropy = 16
      groundTexture.encoding = THREE.sRGBEncoding

      const groundMaterial = new THREE.MeshLambertMaterial({
        map: groundTexture
      })

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000), groundMaterial)
      mesh.position.y = -10
      mesh.rotation.x = -Math.PI / 2
      mesh.receiveShadow = true
      this.scene.add(mesh)

      const axesHelper = new THREE.AxesHelper(500)
      this.scene.add(axesHelper)
      // this.scene.fog = new THREE.Fog(0xcce0ff, 100, 150)
      const hlight = new THREE.AmbientLight(0xffffff, 0.5)
      this.scene.add(hlight)
      const light = new THREE.PointLight(0xffffff, 1, 100)
      light.position.set(0, 50, -20)
      this.scene.add(light)
      this.animate = () => {
        requestAnimationFrame(this.animate)
        const delta = clock.getDelta()
        this.cameraControls.update(delta)
        this.renderer.render(this.scene, this.camera)
      }
      this.animate()
    },
    svgCreated () {
      const loader = new SVGLoader()
      var svgBlob = new Blob([this.svg], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)
      loader.load(
        svgUrl,
        data => {
          var paths = data.paths
          var shapes = []
          for (var i = 0; i < paths.length; i++) {
            Array.prototype.push.apply(shapes, paths[i].toShapes()) // catenate, so we can create a single geometry and mesh
          }
          var extrusionSettings = {
            depth: 2,
            steps: 2,
            curveSegments: 4,
            bevelEnabled: true
          }
          var geometry = new THREE.ExtrudeBufferGeometry(shapes, extrusionSettings)
          geometry.center()
          const material = new THREE.MeshToonMaterial({
            color: new THREE.Color(0x729B6F),
            side: THREE.DoubleSide
            // wireframe: true
          })
          var mesh = new THREE.Mesh(geometry, material)
          mesh.scale.set(0.1, 0.1, 0.1)
          mesh.rotation.set(Math.PI / 2, 0, 0)
          mesh.scale.y *= 1
          const max = mesh.geometry.boundingBox.max
          const min = mesh.geometry.boundingBox.min
          const scale = mesh.scale
          const deltaX = (max.x - min.x) * scale.x
          const deltaY = (max.y - min.y) * scale.y

          let latMin = 180
          let lonMin = 90
          let latMax = -180
          let lonMax = -90

          // Find smallest and largest lat and lon values
          this.coordinates.forEach((el) => {
            if (el[1] < latMin) latMin = el[1]
            if (el[0] < lonMin) lonMin = el[0]
            if (el[1] > latMax) latMax = el[1]
            if (el[0] > lonMax) lonMax = el[0]
          })
          // Max distance between extremeties
          const maxDeltaLat = Math.abs(Math.abs(latMax) - Math.abs(latMin))
          const maxDeltaLon = Math.abs(Math.abs(lonMax) - Math.abs(lonMin))

          // Ratio of actual span vs. padded span
          const ratioLat = maxDeltaLat / (maxDeltaLat + 2)
          const ratioLon = maxDeltaLon / (maxDeltaLon + 2)

          const mapWidthWithoutPadding = ratioLat * deltaX
          const mapHeightWithoutPadding = ratioLon * deltaY
          this.coordinates.forEach((el) => {
            el.relativeLat =
              (Math.abs(Math.abs(latMin) - Math.abs(el[1])) / maxDeltaLat) *
              mapWidthWithoutPadding
            el.relativeLon =
              (Math.abs(Math.abs(lonMin) - Math.abs(el[0])) / maxDeltaLon) *
              mapHeightWithoutPadding
          })
          const startPositionX = -(mapWidthWithoutPadding / 2)
          const startPositionY = mapHeightWithoutPadding / 2

          this.coordinates.forEach((el, index) => {
            geometry = new THREE.SphereGeometry(1, 16, 16)
            const material2 = new THREE.MeshToonMaterial({ color: 'blue' })
            const sphere = new THREE.Mesh(geometry, material2)
            sphere.position.set(
              el.relativeLat + startPositionX,
              2 * index,
              -el.relativeLon + startPositionY
            )
            this.scene.add(sphere)
          })

          this.scene.add(mesh)
        },
        // called when loading is in progresses
        function (xhr) {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        // called when loading has errors
        function (error) {
          console.log('An error happened', error)
        }
      )
    },
    isLight (color) {
      const hex = color.replace('#', '').toLowerCase()
      let red
      let green
      let blue
      let brightness = ''
      if (hex.length === 3) {
        red = parseInt(hex.substr(0, 2), 16)
        green = parseInt(hex.substr(1, 2), 16)
        blue = parseInt(hex.substr(2, 2), 16)
      } else {
        red = parseInt(hex.substr(0, 2), 16)
        green = parseInt(hex.substr(2, 2), 16)
        blue = parseInt(hex.substr(4, 2), 16)
      }
      brightness = (red * 299 + green * 587 + blue * 114) / 1000
      return brightness > 155
    }
  }
}
</script>

<style scoped>
.link {
  margin-left: 2em;
}

.beige {
  /* background-color: #ddd2bc; */
  display: flex;
  justify-items: center;
  align-content: center;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.flex {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}
.image-wrapper {
  display: inline-block;
  max-height: 100%;
  max-width: 100%;
  position: relative;
}
.inner img {
  object-fit: scale-down;
  max-width: 100%;
  max-height: 100%;
  display: inline-block;
  cursor: pointer;
  width: 100%;
}
.day {
  position: absolute;
  top: -1.5rem;
  left: 1rem;
  color: #fff;
  font-size: 3rem;
  font-weight: 600;
  line-height: 100%;
  font-family: "Work Sans", sans-serif;
  text-shadow: 0px 0px 3px #6a6a6a;
}
.caption-wrapper {
  box-sizing: border-box;
  position: relative;
  text-align: center;
  max-height: inherit;
  margin-top: 1em;
  display: table;
  width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-all;
  word-break: break-word;
  max-height: 13vh;
  hyphens: auto;
  max-width: 75%;
  margin: auto;
}
.caption {
  margin: 0;
  padding-left: 0;
  overflow-y: auto;
  padding-right: 0;
  line-height: 1.4rem;
}
.heart-mobile {
  position: absolute;
  min-width: 1em;
  min-height: 1em;
  bottom: 4em;
  right: -2rem;
}

.inner {
  box-sizing: border-box;
  position: relative;
  flex-wrap: wrap;
  align-content: center;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  max-height: inherit;
  margin: 2em 3em;
  max-height: 80%;
  display: inline-block;
  display: flex;
  max-width: 400px;
}
#three {
  background-image: linear-gradient(#edff54, #409498);
}
</style>
