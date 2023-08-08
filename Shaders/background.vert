#version 300 es
in vec4 aPosition;

//uniform mat4 uMat;

out vec4 vPosition;
void main() {
    vPosition = aPosition;
    gl_Position = aPosition;
    gl_Position.z = 1.0;
}
