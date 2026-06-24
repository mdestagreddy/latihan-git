window._GraphJS_isVisibility = true;
window._GraphJS_PowerSaving = true;
Object.defineProperty(window, "GraphJS_PowerSaving", {
  get: () => {
    return window._GraphJS_PowerSaving;
  },
  set: value => {
    window._GraphJS_PowerSaving = value;
    window._GraphJS_isVisibility = !value || (document.visibilityState != "hidden" && value);
  },
  enumerable: true,
  configurable: true
});
document.addEventListener("visibilitychange", () => {
  window._GraphJS_isVisibility = !window._GraphJS_PowerSaving || (document.visibilityState != "hidden" && window._GraphJS_PowerSaving);
}, false);

class GraphJS {
  constructor(canvas) {
    this.canvas = typeof canvas === "string" ? document.querySelector(canvas) : canvas;
    this.ctx = this.canvas.getContext("2d");
    this.fps = 60;
    
    this.data = {};
    this._self = {
      maximum_data_array: 1024,
      graph_max_value: "auto",
      graph_min_value: "auto",
      auto_draw: true,
      draw_scale: 1,
      prev_draw_scale: 1,
      line_width: 1,
      mode: "fit",
      background_color: "#CCC",
      
      invalidate_animation: false
    }
  }
  
  _clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }
  _delta(value) {
    value--;
    return value >= 0 ? 1 + value : 1 / (1 - value);
  }
  
  get width() {
    return this.canvas.width;
  }
  set width(value) {
    this.canvas.width = value;
    
    this.draw();
  }
  
  get height() {
    return this.canvas.height;
  }
  set height(value) {
    this.canvas.height = value;
    
    this.draw();
  }
  
  get scale() {
    return this._self.draw_scale;
  }
  set scale(value) {
    value = this._clamp(value, 0.25, 4);
    if (value !== this._self.draw_scale) {
      this._self.draw_scale = value;
      this.canvas.width *= this._delta(this._self.draw_scale - this._self.prev_draw_scale);
      this.canvas.height *= this._delta(this._self.draw_scale - this._self.prev_draw_scale);
      this._self.prev_draw_scale = this._self.draw_scale;
      
      this.draw();
    }
  }
  
  createData(name, color) {
    if (this.data[name]) return;
    
    this.data[name] = {};
    this.data[name].color = color;
    this.data[name].values = [];
  }
  pushValue(name, value, force = false) {
    if (this.data[name] && (window._GraphJS_isVisibility || force)) {
      this.data[name].values.push(value);
      
      while(true) {
        if (this.data[name].values.length <= this._self.maximum_data_array) break;
        this.data[name].values.shift();
      }
      
      if (this._self.auto_draw) this.draw();
    }
  }
  clearValue(name) {
    if (this.data[name]) this.data[name].values = [];
  }
  
  setValues(name, values) {
    if (this.data[name]) {
      if (values === this.data[name].values) return;
      this.data[name].values = values;
      
      if (this._self.auto_draw) this.draw();
    }
  }
  setValue(name, value, index) {
    index = Math.round(index);
    if (this.data[name] && index >= 0 && index < this.data[name].values.length) {
      if (value === this.data[name].values[index]) return;
      this.data[name].values[index] = value;
      
      if (this._self.auto_draw) this.draw();
    }
  }
  setColor(name, color) {
    if (this.data[name]) {
      if (color === this.data[name].color) return;
      this.data[name].color = color;
      
      if (this._self.auto_draw) this.draw();
    }
  }
  
  getData(name) {
    return this.data[name];
  }
  getValues(name) {
    if (this.data[name]) return this.data[name].values;
    
    return null;
  }
  getValue(name, index) {
    if (this.data[name]) {
      index = this._clamp(Math.round(index), 0, this.data[name].values.length - 1);
      return this.data[name].values[index];
    }
    
    return null;
  }
  getColor(name) {
    if (this.data[name]) return this.data[name].color;
    
    return null;
  }
  
  removeData(name) {
    if (this.data[name]) {
      delete this.data[name];
      this.draw();
    }
  }
  clearAll() {
    this.data = {};
    this.draw();
  }
  
  
  _drawLine(array, index, mode, minV, maxV) {
    const value = this._clamp(array[index] ?? 0, minV, maxV);
    
    let lineX;
    if (mode === "fit") {
      lineX = (index / (array.length - 1)) * this.canvas.width;
    } else if (mode === "at-end") {
      lineX = (index / (this._self.maximum_data_array - 1)) * this.canvas.width + ((this._self.maximum_data_array - array.length) / this._self.maximum_data_array) * this.canvas.width;
    } else if (mode === "at-start") {
      lineX = (index / (this._self.maximum_data_array - 1)) * this.canvas.width;
    }
    const lineY = this.canvas.height - ((value - minV) / (maxV - minV)) * this.canvas.height;
    
    if (index >= 1) this.ctx.lineTo(lineX, lineY);
    else this.ctx.moveTo(lineX, lineY);
  }
  
  draw() {
    if (!this._self.invalidate_animation && window._GraphJS_isVisibility) {
      this._self.invalidate_animation = true;
      setTimeout(() => {
        this._self.invalidate_animation = false;
      }, 1000 / this.fps);
      
      const scale = this._self.draw_scale,
      mode = this._self.mode;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = this._self.background_color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      for (let name in this.data) {
        const color = this.data[name].color,
        values = this.data[name].values;
        
        const minV = this._self.graph_min_value === "auto" ? Math.min(...(values.length != 0 ? values : [0])) : this._self.graph_min_value,
        maxV = this._self.graph_max_value === "auto" ? Math.max(...(values.length != 0 ? values : [0])) : this._self.graph_max_value;
        
        this.ctx.beginPath();
        values.forEach((value, index) => {
          this._drawLine(values, index, mode, minV, maxV);
        });
        this.ctx.lineWidth = scale * this._self.line_width;
        this.ctx.strokeStyle = color;
        this.ctx.stroke();
      }
    }
  }
  
  get autoDraw() {
    return this._self.auto_draw;
  }
  set autoDraw(value) {
    this._self.auto_draw = value;
  }
  
  get minGraphValue() {
    return this._self.graph_min_value;
  }
  set minGraphValue(value) {
    if (value === this._self.graph_min_value) return;
    this._self.graph_min_value = value;
    this.draw();
  }
  
  get maxGraphValue() {
    return this._self.graph_max_value;
  }
  set maxGraphValue(value) {
    if (value === this._self.graph_max_value) return;
    this._self.graph_max_value = value;
    this.draw();
  }
  
  get maxArray() {
    return this._self.maximum_data_array;
  }
  set maxArray(value) {
    if (value === this._self.maximum_data_array) return;
    this._self.maximum_data_array = value;
    this.draw();
  }
  
  get mode() {
    return this._self.mode;
  }
  set mode(value) {
    if (value === this._self.mode) return;
    this._self.mode = value;
    this.draw();
  }
  
  get lineWidth() {
    return this._self.line_width;
  }
  set lineWidth(value) {
    if (value === this._self.line_width) return;
    this._self.line_width = value;
    this.draw();
  }
  
  get backgroundColor() {
    return this._self.background_color;
  }
  set backgroundColor(color) {
    if (color === this._self.background_color) return;
    this._self.background_color = color;
    this.draw();
  }
}