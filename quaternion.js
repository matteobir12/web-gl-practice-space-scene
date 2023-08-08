function createQuaternion(x = 0, y = 0, z = 0, w = 1) {
    return [x, y, z, w];
}

function normalizeQuaternion(q) {
    const length = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
    return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

function multiplyQuaternions(q1, q2) {
    const x = (q2[3] * q1[0]) + (q2[0] * q1[3]) + (q2[1] * q1[2]) - (q2[2] * q1[1]);
    const y = (q2[3] * q1[1]) + (q2[1] * q1[3]) + (q2[2] * q1[0]) - (q2[0] * q1[2]);
    const z = (q2[3] * q1[2]) + (q2[2] * q1[3]) + (q2[0] * q1[1]) - (q2[1] * q1[0]);
    const w = (q2[3] * q1[3]) - (q2[0] * q1[0]) - (q2[1] * q1[1]) - (q2[2] * q1[2]);
    return [x, y, z, w];
}

function quaternionToMatrix(q) {
    const xx = q[0] * q[0];
    const xy = q[0] * q[1];
    const xz = q[0] * q[2];
    const xw = q[0] * q[3];
    const yy = q[1] * q[1];
    const yz = q[1] * q[2];
    const yw = q[1] * q[3];
    const zz = q[2] * q[2];
    const zw = q[2] * q[3];

    return [
        vec4(1-2*(yy-zz),2*(xy-zw),2*(xz-yw),0),
        vec4(2*(xy-zw),1 - 2 * (xx - zz),2* (yz+ xw),0),
        vec4(2 * (xz + yw),2 *(yz - xw),1 - 2.0(xx - yy),0),
        vec4(0,0,0,1)
    ];
}
