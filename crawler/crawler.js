function Crawler(){
	
	this.chromosome = {legs: [], segments: []};
	this.state = [];
	this.max_legs = Math.random()*100;
	this.segment_ids = [];
	this.segment_pool_size = Math.random()*2000;
	this.core = new Core(Math.sqrt(this.segment_pool_size));
	for(var i=0; i<this.max_legs; i++){
		this.chromosome.legs.push(new Base);
		this.segment_ids.push([]);
	}
	for(var i=0; i<this.segment_pool_size; i++){
		this.chromosome.segments.push(new Segment(this.max_legs));
		this.chromosome.segments[i].active && this.segment_ids[this.chromosome.segments[i].leg_id].push(i);
		this.state.push(0);
	}
	
	function constructSegment(that, id, node){
		//lazy multi-reference fuckery
		var lid = that.chromosome.segments[id].leg_id;
		var d = that.chromosome.legs[lid].direction;
		var l = that.chromosome.segments[id].length;
		that.chromosome.segments[id].origin = node; //thanks garbage collection
		var origin = that.chromosome.segments[id].origin; 
		var end = that.chromosome.segments[id].end;
		vec3.copy(origin.p,node.p);		
		vec3.copy(end.p,vec3.add(vec3.create(),origin.p,vec3.scale(vec3.create(),d,l)));
		//vec3.copy(node.pp,node.p); 
		vec3.copy(end.pp,end.p);
		vec3.copy(origin.pp,origin.p);
	}
	this.constructLegs = function(that){
		for(var i=0; i<that.segment_ids.length; i++){
			var id0 = that.segment_ids[i][0];
			(id0 !== undefined) && constructSegment(that, id0, that.core.origin);
			for(var j=1; j<that.segment_ids[i].length; j++){
				var id1 = that.segment_ids[i][j];
				var id2 = that.segment_ids[i][j-1];
				var end = that.chromosome.segments[id2].end;
				constructSegment(that, id1, end);
			}
		}
	}(this);
}

function Node(pos,mass){
	this.p = vec3.clone(pos);
	this.pp = vec3.clone(pos);
	this.v = [0.0,0.0,0.0];
	this.a = [0.0,0.0,0.0];
	this.mass = mass;
}

function Base(){
	this.active = Math.random() > 0.33 ? false : true;
	this.xaxis = Math.random()*2-1;
	this.yaxis = Math.random()*2-1;
	this.zaxis = Math.random()*2-1;
	this.xdir = Math.random()*2-1;
	this.ydir = Math.random()*2-1;
	this.zdir = Math.random()*2-1;
	this.angle = Math.random()*Math.PI*2;
	this.axis = [this.xaxis,this.yaxis,this.zaxis];
	vec3.normalize(this.axis,this.axis);
	this.direction = [this.xdir,this.ydir,this.zdir];
	vec3.normalize(this.direction,this.direction);
}

function Core(mass){
	this.width = 0.2;
	this.origin = new Node([0,0,-20],mass);
}

function Segment(num_legs){
	this.active = Math.random() > 0.5 ? false : true;
	this.length = Math.random() + 0.1;
	this.leg_id = Math.floor(Math.random()*num_legs);
	this.range = Math.random()*Math.PI;
	this.period = Math.random()*10;
	this.offset = Math.random()*Math.PI*2;
	this.strength = Math.random()+0.5;
	this.xaxis = Math.random()*2-1;
	this.yaxis = Math.random()*2-1;
	this.zaxis = Math.random()*2-1;
	this.axis = [this.xaxis,this.yaxis,this.zaxis];
	vec3.normalize(this.axis,this.axis);
	this.origin = new Node([0.0,0.0,0.0],1);
	this.end = new Node([0.0,0.0,0.0],1);
}

