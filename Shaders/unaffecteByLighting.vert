#version 300 es
    in vec4 a_position;

    uniform mat4 uMat;


    void main() {
    gl_Position = uMat* a_position;
}