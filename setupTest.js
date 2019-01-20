const Enzyme = require('enzyme');
const Adapter = require('enzyme-adapter-react-16');
const configure =  require('@commercetools/enzyme-extensions');
const ShallowWrapper  = require('enzyme/ShallowWrapper');

Enzyme.configure({
  adapter: new Adapter()
});
global.self = {};
configure(ShallowWrapper);







