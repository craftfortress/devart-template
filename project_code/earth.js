/**
 * dat.globe Javascript WebGL Globe Toolkit
 * http://dataarts.github.com/dat.globe
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

var SPIN_ID = 0;

var DAT = DAT || {};

DAT.Globe = function (container, colorFn) {

    colorFn = colorFn || function (x) {
        var c = new THREE.Color();

        if (x > 30) x = 30;
        c.setHSV((0.6 - (x * 0.03)), 1.0, 1);
        return c;
    };

    var Shaders = {
        'earth': {
            uniforms: {
                'texture': { type: 't', value: 0, texture: null }
            },
            vertexShader: [
              'varying vec3 vNormal;',
              'varying vec2 vUv;',
              'void main() {',
                'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
                'vNormal = normalize( normalMatrix * normal );',
                'vUv = uv;',
              '}'
            ].join('\n'),
            fragmentShader: [
              'uniform sampler2D texture;',
              'varying vec3 vNormal;',
              'varying vec2 vUv;',
              'void main() {',
                'vec3 diffuse = texture2D( texture, vUv ).xyz;',
                'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
                'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
                'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
              '}'
            ].join('\n')
        },
        'atmosphere': {
            uniforms: {},
            vertexShader: [
              'varying vec3 vNormal;',
              'void main() {',
                'vNormal = normalize( normalMatrix * normal );',
                'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
              '}'
            ].join('\n'),
            fragmentShader: [
              'varying vec3 vNormal;',
              'void main() {',
                'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
                'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
              '}'
            ].join('\n')
        }
    };

    var camera, scene, sceneAtmosphere, renderer, w, h;
    var vector, mesh, atmosphere, point;

    var overRenderer;

    var imgDir = 'skins/';

    var curZoomSpeed = 0;
    var zoomSpeed = 50;

    var mouse = { x: 0, y: 0 }, mouseOnDown = { x: 0, y: 0 };
    var rotation = { x: 0, y: 0 },
        target = { x: Math.PI * .7, y: Math.PI / 6.0 },
        targetOnDown = { x: 0, y: 0 };

    var distance = 100000, distanceTarget = 100000;
    var padding = 40;
    var PI_HALF = Math.PI / 2;
    var particles, particle, geo2;

    function init() {

        container.style.color = '#fff';
        container.style.font = '13px/20px Arial, sans-serif';

        var shader, uniforms, material;
        w = container.offsetWidth || window.innerWidth;
        h = container.offsetHeight || window.innerHeight;

        camera = new THREE.Camera(
            30, w / h, 1, 10000);
        camera.position.z = distance;

        vector = new THREE.Vector3();

        scene = new THREE.Scene();
        sceneAtmosphere = new THREE.Scene();

        var geometry = new THREE.Sphere(200, 40, 30);

        shader = Shaders['earth'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);
         


        var queryStringParameter = getParameterByName('lowres');

        if (queryStringParameter == "true") {
            worldimage = "low_res_nightsky.jpg";
        } else {
            worldimage =  "high_res_nightsky.jpg";
        }

        if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            worldimage = "low_res_nightsky.jpg";
        
        }

        function getParameterByName(name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }


        uniforms['texture'].texture = THREE.ImageUtils.loadTexture(imgDir + worldimage);

        material = new THREE.MeshShaderMaterial({

            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader

        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        scene.addObject(mesh);

        shader = Shaders['atmosphere'];
        uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        material = new THREE.MeshShaderMaterial({

            uniforms: uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader

        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.scale.x = mesh.scale.y = mesh.scale.z = 1.1;
        mesh.flipSided = true;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        sceneAtmosphere.addObject(mesh);

        geometry = new THREE.Cylinder(20, 1, 1, 1);
        var geometry2 = new THREE.Cylinder(10, 1, 1, 1);

        for (var i = 0; i < geometry.vertices.length; i++) {
            var vertex = geometry.vertices[i];
            vertex.position.z += 0.5;

        }
        for (var i = 0; i < geometry2.vertices.length; i++) {
            var vertex = geometry2.vertices[i];
            vertex.position.z += 0.5;
        }


        point = new THREE.Mesh(geometry);
        line = new THREE.Mesh(geometry2);




        //SPACE
      //  var stars = http://i.imgur.com/4YGnGBc.jpg;
        var stars = imgDir + "stars.jpg";

        var urls = [stars, stars,
               stars, stars,
                stars, stars];
        var textureCube = THREE.ImageUtils.loadTextureCube(urls);
        var shader = THREE.ShaderUtils.lib["cube"];
        var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
        uniforms['tCube'].texture = textureCube; // textureCube has been init before
        var material = new THREE.MeshShaderMaterial({
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: uniforms
        }); // build the skybox Mesh
        skyboxMesh = new THREE.Mesh(new THREE.Cube(10000, 10000, 10000, 1, 1, 1, null, true), material);
        // add it to the scene
        scene.addObject(skyboxMesh);

        /*
  var shape = new THREE.TextGeometry("Game Over");
  var wrapper = new THREE.MeshNormalMaterial({ color: 0x00ff00 });
  var words = new THREE.Mesh(shape, wrapper);
  scene.addObject(words);
  */



        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.autoClear = false;
        renderer.setClearColorHex(0x000000, 0.0);
        renderer.setSize(w, h);

        renderer.domElement.style.position = 'absolute';

        container.appendChild(renderer.domElement);

        container.addEventListener('mousedown', onMouseDown, false);

        container.addEventListener('mousewheel', onMouseWheel, false);

        document.addEventListener('keydown', onDocumentKeyDown, false);

        window.addEventListener('resize', onWindowResize, false);

        container.addEventListener('mouseover', function () {
            overRenderer = true;
        }, false);

        container.addEventListener('mouseout', function () {
            overRenderer = false;
        }, false);




        SPIN_ID = setInterval(function () {

            rotate();

        }, 1000 / 60);

    }

    addData = function (data, opts) {
        var lat, lng, size, color, i, step, colorFnWrapper;
        step = 3;
        colorFnWrapper = function (data, i) { return colorFn(data[i + 2]); }

        var subgeo = new THREE.Geometry();
        for (i = 0; i < data.length; i += step) {
            lat = data[i];
            lng = data[i + 1];
            color = colorFnWrapper(data, i);
            size = data[i + 2];
            size = size * 10;
            addPoint(lat, lng, size, color, subgeo);
        }
        this._baseGeometry = subgeo;

    };

    function createPoints() {
        if (this._baseGeometry !== undefined) {

            this.points = new THREE.Mesh(this._baseGeometry, new THREE.MeshBasicMaterial({
                color: 0xffffff,
                vertexColors: THREE.FaceColors,
                morphTargets: false
            }));
            scene.addObject(this.points);
        }
    }

    function addPoint(lat, lng, size, color, subgeo) {
        var phi = (90 - lat) * Math.PI / 180;
        var theta = (180 - lng) * Math.PI / 180;
        var tsize = size;


        point.position.x = 200 * Math.sin(phi) * Math.cos(theta);
        point.position.y = 200 * Math.cos(phi);
        point.position.z = 200 * Math.sin(phi) * Math.sin(theta);

        point.lookAt(mesh.position);

        if (size > 50) {
            size = 50;
        }

        if (tsize > 100) {
            tsize = 100;
        }

        point.scale.z = .01;//-size + 100;


        //point.scale.x = size*.04;
        point.scale.x = 0.5;
        point.scale.y = 0.5;


        //point.scale.y = size * .04;
        point.updateMatrix();

        var i;
        for (i = 0; i < point.geometry.faces.length; i++) {

            point.geometry.faces[i].color = color;

        }

        line.position.x = 200 * Math.sin(phi) * Math.cos(theta);
        line.position.y = 200 * Math.cos(phi);
        line.position.z = 200 * Math.sin(phi) * Math.sin(theta);

        line.lookAt(mesh.position);

        line.scale.z = -tsize;

        line.scale.x = size * .01;
        line.scale.y = size * .01;
        line.updateMatrix();

        if (!mute) {
            playcoin(size);
        }

        var i;
        for (i = 0; i < line.geometry.faces.length; i++) {

            line.geometry.faces[i].color = color;

        }


        GeometryUtils.merge(subgeo, point);
        GeometryUtils.merge(subgeo, line);
    }


    function playcoin(size) {
        var soundname = "coinsound";

        if (size < 10) {
            soundname += "1";
        }

        if (size > 10 && size < 50) {
            soundname += "2";
        }


        if (size >= 50) {
            soundname += "3";
        }


        //  alert(soundname + "  " + size);
        document.getElementById(soundname).play();

    }


    function onMouseDown(event) {
        event.preventDefault();

        container.addEventListener('mousemove', onMouseMove, false);
        container.addEventListener('mouseup', onMouseUp, false);
        container.addEventListener('mouseout', onMouseOut, false);

        mouseOnDown.x = - event.clientX;
        mouseOnDown.y = event.clientY;

        targetOnDown.x = target.x;
        targetOnDown.y = target.y;

        container.style.cursor = 'move';
    }

    function onMouseMove(event) {
        mouse.x = - event.clientX;
        mouse.y = event.clientY;

        var zoomDamp = distance / 1000;

        target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
        target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;

        target.y = target.y > PI_HALF ? PI_HALF : target.y;
        target.y = target.y < -PI_HALF ? -PI_HALF : target.y;
    }

    function onMouseUp(event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
        container.style.cursor = 'auto';
    }

    function onMouseOut(event) {
        container.removeEventListener('mousemove', onMouseMove, false);
        container.removeEventListener('mouseup', onMouseUp, false);
        container.removeEventListener('mouseout', onMouseOut, false);
    }

    function onMouseWheel(event) {
        event.preventDefault();
        if (overRenderer) {
            zoom(event.wheelDeltaY * 0.3);
        }
        return false;
    }

    function onDocumentKeyDown(event) {
        switch (event.keyCode) {
            case 38:
                zoom(100);
                event.preventDefault();
                break;
            case 40:
                zoom(-100);
                event.preventDefault();
                break;
        }
    }

    function onWindowResize(event) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function zoom(delta) {
        distanceTarget -= delta;
        distanceTarget = distanceTarget > 1000 ? 1000 : distanceTarget;
        distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
    }

    function rotate() {

        target.x -= 0.00008;

    }
    function animate() {
        requestAnimationFrame(animate);
        render();
    }

    function render() {
        zoom(curZoomSpeed);

        rotation.x += (target.x - rotation.x) * 0.1;//0.1;
        rotation.y += (target.y - rotation.y) * 0.1;
        distance += (distanceTarget - distance) * 0.3;

        camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
        camera.position.y = distance * Math.sin(rotation.y);
        camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);

        vector.copy(camera.position);

        renderer.clear();

        renderer.render(scene, camera);
        renderer.render(sceneAtmosphere, camera);
    }

    init();
    this.animate = animate;
    this.addData = addData;
    this.createPoints = createPoints;
    this.renderer = renderer;
    this.scene = scene;

    return this;

};

