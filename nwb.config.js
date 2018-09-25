const cssConfig = {
  options: {
    modules: true,
    localIdentName: '[local]-[hash:base64:10]',
  },
}

module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: {
      global: 'BloomDayTimeline',
      externals: {
        react: 'React'
      }
    }
  },
  webpack: {
    rules: {
      less: cssConfig
    }
  }
}
