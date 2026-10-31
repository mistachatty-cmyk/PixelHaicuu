// World palettes. `day` matches the HaiCuu Experience poster (blue sky, pink sakura, bright meadow).
// Every theme has the same keys so worlds can swap between them (a song or a character variant can pick one).
export const THEMES = {
  day: {
    sky: ['#2f6fcf', '#3d86df', '#559ee9', '#74b6f0', '#98ccf5', '#bddff9', '#dff0fc', '#f1f9ff'],
    farHill: ['#c4e8d6', '#a9dcc2'],
    cloud: { hi: '#ffffff', mid: '#eaf4ff', lo: '#c4dcf3' },
    ground: {
      top: '#b5ee7c', g1: '#6cc24a', g2: '#57ad40',
      soil: ['#8a5a3c', '#744a35', '#5e3b2e', '#4a2e26'],
      blades: ['#7ad04a', '#6cc24a', '#b5ee7c'],
      flowers: ['#ffffff', '#ffd1e6', '#ffe566', '#d9a6ff'],
    },
    sun: { disc: ['#f0a21a', '#ffc425', '#ffd633', '#ffe36b'], edge: '#e8901a', ray: '#ffd84a', face: '#d9791a', cheek: '#ff9a5a' },
    blossom: { ramp: ['#7a4a98', '#a86bb0', '#d28cc4', '#f2b0d8', '#ffd4ea', '#fff0f7'] },
    bark: ['#3b2230', '#5a3a3f', '#7a5348', '#a07058'],
    petals: ['#ffc2de', '#ff9ccb', '#fff0f7'],
    stars: 0,
    starColor: '#ffffff',
  },
  dusk: {
    sky: ['#2a1a5e', '#4b2a86', '#7a3a9a', '#b0488f', '#e0627f', '#f8856f', '#ffb075', '#ffe0a0'],
    farHill: ['#8a4a8e', '#6e3a7a'],
    cloud: { hi: '#ffd9c2', mid: '#f6a9a0', lo: '#b86a9a' },
    ground: {
      top: '#c8d65a', g1: '#7aa845', g2: '#5f8e3f',
      soil: ['#6d3f3c', '#58333a', '#43283a', '#30202f'],
      blades: ['#8fb94f', '#7aa845', '#c8d65a'],
      flowers: ['#ffe2c4', '#ffb3cb', '#ffe566', '#d9a6ff'],
    },
    sun: { disc: ['#ff7a2a', '#ff9a3c', '#ffc65a', '#fff0b0'], edge: '#ff6a3a', ray: '#ffc65a', face: '#a8401a', cheek: '#ff6a5a' },
    blossom: { ramp: ['#5a2a7a', '#8a4a9a', '#bc6cb0', '#e892c4', '#ffbcdc', '#ffe3ee'] },
    bark: ['#2e1a2a', '#4a2e3a', '#6a4448', '#8c6058'],
    petals: ['#ffbcdc', '#ff9ccb', '#ffe3ee'],
    stars: 0.12,
    starColor: '#fff4d6',
  },
  night: {
    sky: ['#05061a', '#0a0e2e', '#101744', '#192259', '#232d70', '#2f3a85', '#3d4a9a', '#505fae'],
    farHill: ['#2c3a78', '#222c62'],
    cloud: { hi: '#6d78c8', mid: '#4d57a4', lo: '#343c80' },
    ground: {
      top: '#4fae83', g1: '#2f7f62', g2: '#256a55',
      soil: ['#2f3a5a', '#262f4d', '#1d2540', '#141a30'],
      blades: ['#3f9f78', '#2f7f62', '#58bf8e'],
      flowers: ['#c8d0ff', '#ffb3cb', '#ffe566', '#d9a6ff'],
    },
    sun: { disc: ['#aab4ee', '#c4ccf6', '#dfe4ff', '#f4f6ff'], edge: '#98a2de', ray: '#c4ccf6', face: '#6a74b8', cheek: '#ff9ab8' },
    blossom: { ramp: ['#2c1f5a', '#4a3580', '#6e50a0', '#9470bc', '#bc98d8', '#e0c4ee'] },
    bark: ['#150f22', '#241a34', '#37294a', '#4c3a60'],
    petals: ['#c4a0e0', '#ff9ccb', '#e0c4ee'],
    stars: 0.55,
    starColor: '#fff4d6',
  },
};
export const THEME_NAMES = Object.keys(THEMES);
