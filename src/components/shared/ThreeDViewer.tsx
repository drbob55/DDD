// src/components/shared/ThreeDViewer.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

interface ThreeDViewerProps {
  fileUrl: string;
  fileType: 'stl' | 'obj' | 'ply';
  height?: string;
  onError?: () => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for 3D preview
const MAX_VERTICES = 1000000; // Maximum vertices before simplification warning

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ 
  fileUrl, 
  fileType, 
  height = '100%',
  onError 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [performanceWarning, setPerformanceWarning] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);
  
  // Store refs for cleanup
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const objectRef = useRef<THREE.Object3D | null>(null);

  // Check WebGL support
  const checkWebGLSupport = useCallback(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return false;
      }
      
      // Check for required extensions
      const requiredExtensions = ['OES_element_index_uint', 'OES_standard_derivatives'];
      for (const ext of requiredExtensions) {
        if (!gl.getExtension(ext)) {
          console.warn(`WebGL extension ${ext} not supported`);
        }
      }
      
      return true;
    } catch (e) {
      console.error('WebGL check failed:', e);
      return false;
    }
  }, []);

  // Cleanup function to dispose of Three.js resources
  const cleanupThreeJS = useCallback(() => {
    // Cancel animation frame
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    // Dispose of object geometry and materials
    if (objectRef.current) {
      objectRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Dispose geometry
          if (child.geometry) {
            child.geometry.dispose();
          }
          
          // Dispose materials
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                mat.dispose();
                // Dispose textures if any
                Object.values(mat).forEach((value: any) => {
                  if (value instanceof THREE.Texture) {
                    value.dispose();
                  }
                });
              });
            } else {
              child.material.dispose();
              // Dispose textures if any
              Object.values(child.material).forEach((value: any) => {
                if (value instanceof THREE.Texture) {
                  value.dispose();
                }
              });
            }
          }
        }
      });
      objectRef.current = null;
    }

    // Clear scene
    if (sceneRef.current) {
      while(sceneRef.current.children.length > 0) {
        const child = sceneRef.current.children[0];
        sceneRef.current.remove(child);
      }
      sceneRef.current = null;
    }

    // Dispose controls
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }

    // Dispose renderer
    if (rendererRef.current) {
      try {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        const gl = rendererRef.current.getContext();
        if (gl && gl.getExtension('WEBGL_lose_context')) {
          gl.getExtension('WEBGL_lose_context')!.loseContext();
        }
      } catch (e) {
        console.warn('Error disposing renderer:', e);
      }
      
      if (mountRef.current && rendererRef.current.domElement) {
        try {
          mountRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          // Element might already be removed
        }
      }
      rendererRef.current = null;
    }

    // Clear other refs
    cameraRef.current = null;
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Check WebGL support first
    const isWebGLSupported = checkWebGLSupport();
    if (!isWebGLSupported) {
      setWebGLSupported(false);
      setError('WebGL is not supported in your browser. Please try a different browser or enable WebGL.');
      setLoading(false);
      if (onError) onError();
      return;
    }

    let mounted = true;
    const abortController = new AbortController();

    // Check file size first
    const checkFileSize = async () => {
      try {
        const response = await fetch(fileUrl, { 
          method: 'HEAD',
          signal: abortController.signal 
        });
        const contentLength = response.headers.get('content-length');
        
        if (contentLength) {
          const size = parseInt(contentLength);
          
          if (size > MAX_FILE_SIZE) {
            setError(`File too large for preview (${(size / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            setLoading(false);
            if (onError) onError();
            return false;
          }
        }
        return true;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return false;
        }
        console.error('Error checking file size:', err);
        return true; // Continue anyway
      }
    };

    const initializeViewer = async () => {
      try {
        const canLoad = await checkFileSize();
        if (!canLoad || !mounted) return;

        const width = mountRef.current!.clientWidth;
        const height = mountRef.current!.clientHeight;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Renderer setup with better error handling
        let renderer: THREE.WebGLRenderer;
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('webgl2', {
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false
          }) || canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false
          });

          if (!context) {
            throw new Error('WebGL context creation failed');
          }

          renderer = new THREE.WebGLRenderer({ 
            canvas,
            context: context as WebGLRenderingContext,
            antialias: true,
            alpha: true,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false
          });
          
          renderer.setSize(width, height);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFSoftShadowMap;
          rendererRef.current = renderer;
          
          if (mounted && mountRef.current) {
            mountRef.current.appendChild(renderer.domElement);
          }
        } catch (err) {
          console.error('Error creating WebGL renderer:', err);
          setError('Failed to initialize 3D viewer. Your device may not support WebGL or has insufficient resources.');
          setLoading(false);
          if (onError) onError();
          return;
        }

        // Optimized lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(10, 10, 10);
        directionalLight1.castShadow = true;
        directionalLight1.shadow.mapSize.width = 1024;
        directionalLight1.shadow.mapSize.height = 1024;
        scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-10, 5, -10);
        scene.add(directionalLight2);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 1;
        controls.maxDistance = 50;
        controlsRef.current = controls;

        // Grid and axes helpers
        const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
        scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);

        // Load the model
        try {
          setLoading(true);
          setError(null);
          setLoadingProgress(0);

          let loader: STLLoader | OBJLoader | PLYLoader;
          
          switch (fileType) {
            case 'stl':
              loader = new STLLoader();
              break;
            case 'obj':
              loader = new OBJLoader();
              break;
            case 'ply':
              loader = new PLYLoader();
              break;
            default:
              throw new Error(`Unsupported file type: ${fileType}`);
          }

                    loader.load(
            fileUrl,
            (result: any) => {
              if (!mounted) return;

              try {
                let object: THREE.Object3D;
                
                if (fileType === 'stl' || fileType === 'ply') {
                  const geometry = result as THREE.BufferGeometry;
                  
                  // Check geometry complexity
                  const vertexCount = geometry.attributes.position?.count || 0;
                  console.log(`${fileType.toUpperCase()} file has ${vertexCount} vertices`);
                  
                  if (vertexCount > MAX_VERTICES) {
                    setPerformanceWarning(true);
                  }

                  geometry.computeVertexNormals();
                  geometry.center();

                  const material = new THREE.MeshPhongMaterial({
                    color: fileType === 'stl' ? 0x0066ff : 0x00cc88,
                    specular: 0x111111,
                    shininess: 200,
                    side: THREE.DoubleSide
                  });
                  
                  object = new THREE.Mesh(geometry, material);
                  object.castShadow = true;
                  object.receiveShadow = true;
                } else {
                  object = result;
                  
                  object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      child.castShadow = true;
                      child.receiveShadow = true;
                      
                      if (!child.material) {
                        child.material = new THREE.MeshPhongMaterial({
                          color: 0x888888,
                          side: THREE.DoubleSide
                        });
                      }
                    }
                  });
                }

                objectRef.current = object;

                // Center and scale
                const box = new THREE.Box3().setFromObject(object);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                object.position.sub(center);
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetSize = 6;
                const scale = targetSize / maxDim;
                object.scale.setScalar(scale);
                
                // Add platform
                const platformGeometry = new THREE.CylinderGeometry(5, 5, 0.1, 32);
                const platformMaterial = new THREE.MeshPhongMaterial({ color: 0xdddddd });
                const platform = new THREE.Mesh(platformGeometry, platformMaterial);
                platform.position.y = -0.05;
                platform.receiveShadow = true;
                scene.add(platform);

                scene.add(object);
                
                // Adjust camera
                const fov = camera.fov * (Math.PI / 180);
                const cameraDistance = Math.abs(targetSize / Math.sin(fov / 2)) * 1.5;
                camera.position.set(cameraDistance, cameraDistance * 0.5, cameraDistance);
                camera.lookAt(0, 0, 0);
                controls.target.set(0, 0, 0);
                controls.update();

                setLoading(false);
                setLoadingProgress(100);

              } catch (err) {
                console.error('Error processing 3D model:', err);
                setError('Failed to process 3D model. The file may be corrupted or too complex.');
                setLoading(false);
                if (onError) onError();
              }
            },
            (xhr) => {
              if (xhr.lengthComputable) {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                setLoadingProgress(Math.round(percentComplete));
              }
            },
            (error) => {
              if (!mounted) return;
              console.error('Error loading 3D file:', error);
              setError('Failed to load 3D file. Please check the file format and try again.');
              setLoading(false);
              if (onError) onError();
            }
          );

        } catch (err) {
          console.error('Error in model loading:', err);
          setError('Failed to initialize 3D model loader');
          setLoading(false);
          if (onError) onError();
        }

        // Animation loop
        let lastTime = 0;
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;

        const animate = (currentTime: number) => {
          if (!mounted) return;
          
          animationIdRef.current = requestAnimationFrame(animate);
          
          const deltaTime = currentTime - lastTime;
          
          if (deltaTime > frameInterval) {
            lastTime = currentTime - (deltaTime % frameInterval);
            
            if (controls) controls.update();
            
            if (renderer && scene && camera) {
              try {
                renderer.render(scene, camera);
              } catch (err) {
                console.error('Render error:', err);
                // Don't stop the animation loop on render errors
              }
            }
          }
        };
        animate(0);

        // Handle resize
        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            if (!mountRef.current || !camera || !renderer || !mounted) return;
            
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
          }, 200);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
          mounted = false;
          abortController.abort();
          window.removeEventListener('resize', handleResize);
          clearTimeout(resizeTimeout);
          cleanupThreeJS();
        };

      } catch (err) {
        console.error('Error in viewer initialization:', err);
        setError('Failed to initialize 3D viewer');
        setLoading(false);
        if (onError) onError();
      }
    };

    initializeViewer();

    return () => {
      cleanupThreeJS();
    };
  }, [fileUrl, fileType, onError, cleanupThreeJS, checkWebGLSupport]);

  // Fallback UI for non-WebGL browsers
  if (!webGLSupported) {
    return (
      <div className="relative w-full" style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-center p-4 max-w-sm">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              3D Preview Not Available
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your browser doesn't support WebGL. Please try Chrome, Firefox, or Safari.
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = `model.${fileType}`;
                link.click();
              }}
              className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              Download File Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mountRef} className="w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800" />
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              {loadingProgress > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {loadingProgress}%
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading {fileType.toUpperCase()} model...
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg">
          <div className="text-center p-4 max-w-sm">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Preview Unavailable
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {error}
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = `model.${fileType}`;
                link.click();
              }}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              Download File
            </button>
          </div>
        </div>
      )}
      
      {performanceWarning && !loading && !error && (
        <div className="absolute top-2 left-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs px-2 py-1 rounded">
          Large file - performance may vary
        </div>
      )}
      
      {!loading && !error && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Drag to rotate • Scroll to zoom • Shift+drag to pan
        </div>
      )}
    </div>
  );
};