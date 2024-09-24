import * as confetti from 'canvas-confetti';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key are required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Student {
  id: string;
  name: string;
  avatar: string;
  points: number;
}

class ClassroomManagement {
  private students: Student[] = [];
  private studentGrid: HTMLElement;
  private isStudentView: boolean;
  private addStudentBtn: HTMLElement;
  private addStudentModal: HTMLElement;
  private submitStudentBtn: HTMLElement;
  private closeModalBtn: HTMLElement;
  private resetPointsBtn: HTMLElement;
  private loginOverlay: HTMLElement;
  private passwordInput: HTMLInputElement;
  private loginButton: HTMLElement;
  private mainContent: HTMLElement;
  private logoutBtn: HTMLElement;
  private pointSound: HTMLAudioElement;
  private confirmResetModal: HTMLElement;
  private confirmResetBtn: HTMLElement;
  private cancelResetBtn: HTMLElement;
  private giveAllPointsBtn: HTMLElement;

  constructor() {
    this.isStudentView = document.body.classList.contains('student-view');
    if (document.querySelector('body').contains(document.getElementById('studentGrid'))) {
      if (this.isStudentView) {
        this.initializeStudentPage();
      } else {
        this.initializeTeacherPage();
      }
    }
  }

  private initializeStudentPage() {
    this.studentGrid = document.getElementById("studentGrid")!;
    this.loadStudents();
  }

  private initializeTeacherPage() {
    this.studentGrid = document.getElementById("studentGrid")!;
    this.addStudentBtn = document.getElementById("addStudentBtn")!;
    this.addStudentModal = document.getElementById("addStudentModal")!;
    this.submitStudentBtn = document.getElementById("submitStudent")!;
    this.closeModalBtn = document.getElementById("closeModal")!;
    this.resetPointsBtn = document.getElementById("resetPointsBtn")!;
    this.logoutBtn = document.getElementById("logoutBtn")!;
    this.giveAllPointsBtn = document.getElementById("giveAllPointsBtn")!;
    
    const pointSoundElement = document.getElementById('pointSound');
    if (pointSoundElement instanceof HTMLAudioElement) {
      this.pointSound = pointSoundElement;
      this.pointSound.load(); // Preload the audio
    } else {
      console.error('Point sound element not found or is not an audio element');
    }
    
    this.loginOverlay = document.getElementById("loginOverlay")!;
    this.passwordInput = document.getElementById("passwordInput") as HTMLInputElement;
    this.loginButton = document.getElementById("loginButton")!;
    this.mainContent = document.getElementById("mainContent")!;

    this.confirmResetModal = document.getElementById("confirmResetModal")!;
    this.confirmResetBtn = document.getElementById("confirmResetBtn")!;
    this.cancelResetBtn = document.getElementById("cancelResetBtn")!;

    this.addEventListeners();
    this.populateAvatarOptions();
    this.checkLoginStatus();
  }

  private addEventListeners() {
    this.loginButton?.addEventListener("click", () => this.login());
    this.addStudentBtn?.addEventListener("click", () => this.openModal());
    this.submitStudentBtn?.addEventListener("click", () => this.addStudent());
    this.closeModalBtn?.addEventListener("click", () => this.closeModal());
    this.resetPointsBtn?.addEventListener("click", () => this.showResetConfirmation());
    this.giveAllPointsBtn?.addEventListener("click", () => this.giveAllStudentsOnePoint());
    this.confirmResetBtn?.addEventListener("click", () => this.resetAllPoints());
    this.cancelResetBtn?.addEventListener("click", () => this.closeResetConfirmation());
    this.logoutBtn?.addEventListener("click", () => this.logout());
  }

  private checkLoginStatus() {
    if (this.isLoginValid()) {
      this.showContent();
    } else {
      this.showLoginOverlay();
    }
  }

  private isLoginValid(): boolean {
    const loginTimestamp = localStorage.getItem("loginTimestamp");
    if (!loginTimestamp) return false;

    const currentTime = new Date().getTime();
    const loginTime = parseInt(loginTimestamp, 10);
    const hoursSinceLogin = (currentTime - loginTime) / (1000 * 60 * 60);

    return hoursSinceLogin < 24;
  }

  private setLoginTimestamp(): void {
    localStorage.setItem("loginTimestamp", new Date().getTime().toString());
  }

  private login() {
    console.log("Login function called");
    const password = this.passwordInput.value;
    console.log("Entered password:", password);
    if (password === process.env.TEACHER_PASSWORD) {
      console.log("Password correct, setting login timestamp");
      this.setLoginTimestamp();
      console.log("Showing content");
      this.showContent();
    } else {
      console.log("Incorrect password");
      alert("Incorrect password. Please try again.");
      this.passwordInput.value = "";
      this.passwordInput.focus();
    }
  }

  private showLoginOverlay() {
    this.loginOverlay.style.display = "flex";
    this.mainContent.classList.add("blurred");
    this.logoutBtn.style.display = "none"; // Hide logout button when logged out
  }

  private showContent() {
    this.loginOverlay.style.display = "none";
    this.mainContent.classList.remove("blurred");
    this.logoutBtn.style.display = "block"; // Show logout button when logged in
    this.populateAvatarOptions(); // Add this line
    this.loadStudents();
  }

  private populateAvatarOptions(): void {
    const avatarSelect = document.getElementById(
      "studentAvatar"
    ) as HTMLSelectElement;
    avatarSelect.innerHTML = this.getAvatarOptions("");
  }

  private async loadStudents(): Promise<void> {
    const { data, error } = await supabase.from("students").select("*");

    if (error) {
      console.error("Error loading students:", error);
      return;
    }

    this.students = data || [];
    this.renderStudents();
  }

  private getAvatarOptions(selectedAvatar: string): string {
    const avatars = [
      "😀", "😎", "🤓", "🧑‍🎓", "👩‍🎓", "👨‍🎓", "🦄", "🐶", "🐱", "🦊",
      "🦁", "🐯", "🐸", "🐵", "🐼", "🐨", "🐷", "🐙", "🐬", "🦋",
      "🦖", "🦕", "🚀", "🌈", "🍕", "🍦", "🎨", "🏀", "⚽", "🎸"
    ];
    return avatars
      .map(
        (avatar) =>
          `<option value="${avatar}" ${
            avatar === selectedAvatar ? "selected" : ""
          }>${avatar}</option>`
      )
      .join("");
  }

  private renderStudents(): void {
    this.studentGrid.innerHTML = "";
    this.students.forEach((student) => {
      const studentCard = document.createElement("div");
      studentCard.className = "student-card";
      studentCard.dataset.studentId = student.id;
      
      if (this.isStudentView) {
        studentCard.innerHTML = `
          <div class="student-info">
            <div class="student-avatar">${student.avatar}</div>
            <h3 class="student-name">${student.name}</h3>
          </div>
          <div class="points-container">
            <div class="student-points">${student.points}</div>
          </div>
        `;
      } else {
        studentCard.innerHTML = `
          <div class="student-info">
            <div class="student-avatar">${student.avatar}</div>
            <h3 class="student-name">${student.name}</h3>
          </div>
          <div class="points-container">
            <div class="student-points">${student.points}</div>
            <div class="point-buttons">
              <button class="remove-point">-</button>
              <button class="add-point">+</button>
            </div>
          </div>
          <div class="edit-icon">✏️</div>
          <div class="edit-controls" style="display: none;">
            <input type="text" class="edit-name" value="${student.name}">
            <select class="edit-avatar">
              ${this.getAvatarOptions(student.avatar)}
            </select>
            <input type="number" class="edit-points" value="${student.points}">
            <div class="button-container">
              <button class="save-edit">Save</button>
              <button class="delete-student">Delete</button>
            </div>
          </div>
        `;

        const addPointBtn = studentCard.querySelector(".add-point");
        const removePointBtn = studentCard.querySelector(".remove-point");
        const editIcon = studentCard.querySelector(".edit-icon");
        const saveEditBtn = studentCard.querySelector(".save-edit");
        const deleteStudentBtn = studentCard.querySelector(".delete-student");

        addPointBtn?.addEventListener("click", () => this.updatePoints(student.id, 1));
        removePointBtn?.addEventListener("click", () => this.updatePoints(student.id, -1));
        editIcon?.addEventListener("click", () => this.toggleEditMode(studentCard));
        saveEditBtn?.addEventListener("click", () => this.saveStudentEdit(student.id, studentCard));
        deleteStudentBtn?.addEventListener("click", () => this.deleteStudent(student.id));
      }

      this.studentGrid.appendChild(studentCard);
    });
  }

  private toggleEditMode(studentCard: HTMLElement): void {
    const editControls = studentCard.querySelector(".edit-controls");
    const displayElements = studentCard.querySelectorAll(
      ".student-avatar, .student-name, .points-container"
    );

    if (editControls?.getAttribute("style") === "display: none;") {
      // Entering edit mode
      editControls.setAttribute("style", "display: block;");
      displayElements.forEach((el) =>
        el.setAttribute("style", "display: none;")
      );

      // Ensure input values are set correctly
      const student = this.students.find(
        (s) => s.id === studentCard.dataset.studentId
      );
      if (student) {
        const nameInput = editControls.querySelector(
          ".edit-name"
        ) as HTMLInputElement;
        const avatarSelect = editControls.querySelector(
          ".edit-avatar"
        ) as HTMLSelectElement;
        const pointsInput = editControls.querySelector(
          ".edit-points"
        ) as HTMLInputElement;

        nameInput.value = student.name;
        avatarSelect.value = student.avatar;
        pointsInput.value = student.points.toString();
      }
    } else {
      // Exiting edit mode
      editControls?.setAttribute("style", "display: none;");
      displayElements.forEach((el) => el.removeAttribute("style"));
    }
  }

  private async saveStudentEdit(
    id: string,
    studentCard: HTMLElement
  ): Promise<void> {
    const nameInput = studentCard.querySelector(
      ".edit-name"
    ) as HTMLInputElement;
    const avatarSelect = studentCard.querySelector(
      ".edit-avatar"
    ) as HTMLSelectElement;
    const pointsInput = studentCard.querySelector(
      ".edit-points"
    ) as HTMLInputElement;

    const updatedStudent: Partial<Student> = {
      name: nameInput.value.trim(),
      avatar: avatarSelect.value,
      points: parseInt(pointsInput.value, 10),
    };

    const { data, error } = await supabase
      .from("students")
      .update(updatedStudent)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating student:", error);
      return;
    }

    if (data) {
      const studentIndex = this.students.findIndex((s) => s.id === id);
      this.students[studentIndex] = data[0];
      this.renderStudents();
    }
  }

  private async deleteStudent(id: string): Promise<void> {
    if (confirm("Are you sure you want to delete this student?")) {
      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) {
        console.error("Error deleting student:", error);
        return;
      }

      this.students = this.students.filter((s) => s.id !== id);
      this.renderStudents();
    }
  }

  private async updatePoints(id: string, change: number): Promise<void> {
    const studentIndex = this.students.findIndex((s) => s.id === id);
    const newPoints = Math.max(0, this.students[studentIndex].points + change);

    const { data, error } = await supabase
      .from("students")
      .update({ points: newPoints })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating points:", error);
      return;
    }

    if (data) {
      this.students[studentIndex] = data[0];
      this.renderStudents();

      if (change > 0) {
        await this.playPointSound();
        this.showConfetti();
      }
    }
  }

  private async playPointSound(): Promise<void> {
    try {
      this.pointSound.currentTime = 0;
      await this.pointSound.play();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  private showConfetti(): void {
    const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true
    });

    const isMobile = window.innerWidth <= 768;

    const count = isMobile ? 100 : 200;
    const defaults = {
      origin: { y: isMobile ? 0.2 : 0.7 },
      spread: isMobile ? 60 : 360,
      ticks: isMobile ? 50 : 100,
      gravity: 0.5,
      decay: 0.94,
      startVelocity: isMobile ? 15 : 30,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      myConfetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    if (isMobile) {
      fire(0.25, {
        spread: 26,
        startVelocity: 25,
      });

      fire(0.2, {
        spread: 40,
      });

      fire(0.35, {
        spread: 60,
        decay: 0.91,
        scalar: 0.8
      });

      fire(0.1, {
        spread: 80,
        startVelocity: 15,
        decay: 0.92,
        scalar: 1.2
      });

      fire(0.1, {
        spread: 80,
        startVelocity: 25,
      });
    } else {
      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });

      fire(0.2, {
        spread: 60,
      });

      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }

  private openModal(): void {
    this.addStudentModal.style.display = "block";
  }

  private closeModal(): void {
    this.addStudentModal.style.display = "none";
  }

  private async addStudent(): Promise<void> {
    const nameInput = document.getElementById(
      "studentName"
    ) as HTMLInputElement;
    const avatarSelect = document.getElementById(
      "studentAvatar"
    ) as HTMLSelectElement;
    const name = nameInput.value.trim();
    const avatar = avatarSelect.value;

    if (name) {
      const newStudent: Omit<Student, "id"> = {
        name: name,
        avatar: avatar,
        points: 0,
      };

      const { data, error } = await supabase
        .from("students")
        .insert([newStudent])
        .select();

      if (error) {
        console.error("Error adding student:", error);
        return;
      }

      if (data) {
        this.students.push(data[0]);
        this.renderStudents();
        this.closeModal();
        nameInput.value = "";
        avatarSelect.selectedIndex = 0;
      }
    }
  }

  private showResetConfirmation(): void {
    this.confirmResetModal.style.display = "block";
  }

  private closeResetConfirmation(): void {
    this.confirmResetModal.style.display = "none";
  }

  private async resetAllPoints(): Promise<void> {
    this.closeResetConfirmation();

    for (const student of this.students) {
      const { error } = await supabase
        .from("students")
        .update({ points: 0 })
        .eq("id", student.id);

      if (error) {
        console.error(`Error resetting points for student ${student.id}:`, error);
      }
    }

    // Reload students after resetting points
    await this.loadStudents();
  }

  private async giveAllStudentsOnePoint(): Promise<void> {
    for (const student of this.students) {
      const { error } = await supabase
        .from("students")
        .update({ points: student.points + 1 })
        .eq("id", student.id);

      if (error) {
        console.error(`Error giving point to student ${student.id}:`, error);
      }
    }

    // Reload students after giving points
    await this.loadStudents();
    
    // Play sound and show confetti for all students
    await this.playPointSound();
    this.showConfetti();
  }

  private logout(): void {
    localStorage.removeItem("loginTimestamp");
    this.showLoginOverlay();
  }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('body').contains(document.getElementById('studentGrid'))) {
    const app = new ClassroomManagement();
    if (document.body.classList.contains('student-view')) {
      console.log("Student application initialized");
    } else {
      console.log("Teacher application initialized");
    }
  }
});