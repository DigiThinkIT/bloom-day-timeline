module.exports = {
  source: {
    include: ["./src/"]
  },
  opts: {
    destination: "./docs/"
  },
  templates: {
    default: {
      layoutFile: "./layout.tmpl"
    }
  }
}