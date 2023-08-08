#version 300 es

    in vec4 aPosition;
    in vec3 aNormal;
    in vec2 aTextCoord;

    uniform mat4 uMat;

    uniform mat4 uWorld;
    uniform mat4 uWorldInverseTranspose;
    uniform vec3 uViewerWorldPosition;

    out vec3 vNormal;
    out vec3 surfaceWorldPosition;
    out vec3 vSurfaceToViewer;
    out vec2 vTextCoord;

    void main() {
        vTextCoord = aTextCoord;
        gl_Position = uMat * aPosition;

        vNormal = mat3(uWorldInverseTranspose) * aNormal;

        surfaceWorldPosition = (uWorld * aPosition).xyz;
        vSurfaceToViewer = uViewerWorldPosition - surfaceWorldPosition;
}