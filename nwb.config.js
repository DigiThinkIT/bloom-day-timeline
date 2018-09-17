module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: {
      global: 'BloomDayTimeSlices',
      externals: {
        react: 'React'
      }
    }
  }
}
